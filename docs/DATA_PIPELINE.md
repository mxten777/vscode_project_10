# 나라장터 데이터 수집·저장 파이프라인

> 작성일: 2026-03-10 / 최종 업데이트: 2026-04-14  
> 대상: 개발팀 / 고객 설명용

---

## 1. 전체 흐름 한눈에 보기

```
[나라장터 공공API]
      │
      │  KST 09:00 (평일)  ─────────────────────────────────────────────────────────────────
      ▼
[poll-tenders]  →  tenders 테이블 upsert  →  analysis_level = 1 (기본)
      │
      │  KST 09:10 (평일)
      ▼
[collect-bid-awards]  →  awards + bid_notices + bid_awards upsert
      │                   bid_participants (낙찰자 rank=1) upsert
      │
      │  KST 11:00 (평일)
      ▼
[process-alerts]  →  신규 공고 알림 규칙 매칭  →  이메일 발송
      │
      │  KST 03:00 (매일)
      ▼
[collect-participants]  →  level2+ CLOSED/RESULT 공고 선별
      │                    awards에서 참여업체 전체 bid_participants upsert
      │                    tenders.participants_collected = true
      │
      │  KST 05:00 (매일)
      ▼
[rebuild-analysis]  →  agency/industry/region_analysis 캐시 재구성
      │                compute_analysis_levels() 실행
      │                 └→ level2 승격: OPEN(마감≤7일 or 예산≥1억) + CLOSED/RESULT(+awards)
      │                 └→ level3 승격: favorites 또는 participants_collected=true
      │
      │  온디맨드 (사용자가 공고 상세 조회 시)
      ▼
[GET /api/tenders/:id/participants]  →  즐겨찾기/마감임박/예산조건 만족 시
                                        awards에서 참여업체 수집 + analysis_level → 3
```

### Cron 스케줄 요약

| Job | 스케줄 (UTC) | KST | 설명 |
|-----|-------------|-----|------|
| poll-tenders | `0 0 * * 1-5` | 09:00 평일 | 신규 공고 수집 |
| collect-bid-awards | `10 0 * * 1-5` | 09:10 평일 | 낙찰 데이터 수집 |
| process-alerts | `0 2 * * 1-5` | 11:00 평일 | 알림 발송 |
| collect-participants | `0 18 * * *` | 03:00 매일 | 참여업체 선별 수집 |
| rebuild-analysis | `0 20 * * *` | 05:00 매일 | 분석 캐시 재구성 |
| embed-batch | `0 2 * * 1` | 11:00 월요일 | 벡터 임베딩 |
| cleanup | `0 1 * * 0` | 10:00 일요일 | 90일 이전 로그 삭제 |

---

## 2. 분석 레벨 3단계 구조 (Analysis Levels)

### 레벨 정의

| 레벨 | 대상 | 수집 범위 | 특징 |
|------|------|----------|------|
| **Level 1 (기본)** | 모든 공고 | 공고 기본 정보만 | 검색/목록 표시용 |
| **Level 2 (후보군)** | OPEN(마감≤7일 or 예산≥1억) + CLOSED/RESULT with awards | 공고+낙찰 데이터 | AI 투찰가 추천 가능 |
| **Level 3 (정밀)** | 즐겨찾기 또는 participants_collected=true | 공고+낙찰+참여업체 전체 | 정밀 경쟁자 분석 가능 |

### 레벨 승격 로직 (`compute_analysis_levels()` DB 함수)

```sql
-- Level 2 승격 조건
OPEN + (deadline ≤ 7일 OR budget ≥ 100,000,000)
CLOSED or RESULT + (awards 존재)

-- Level 3 승격 조건
favorites 에 등록됨
OR participants_collected = true
```

### bid_participants 수집 흐름

```
awards 테이블 (낙찰자 1건)
    ↑
collect-bid-awards / backfill-awards  →  rank=1 낙찰자만 즉시 저장

awards 테이블 (참여업체 전체)
    ↑
collect-participants (매일 18:00 UTC)  →  CLOSED/RESULT + level2+ 선별 수집
                                          tenders.participants_collected = true

awards 테이블 (온디맨드)
    ↑
GET /api/tenders/:id/participants  →  사용자 조회 시 즉시 수집 + level3 승격
```

---

---

## 2. 데이터 수집 단계 상세

### 2-1. 수집 주기

| 항목 | 내용 |
|------|------|
| 실행 시각 | 매주 월~금 오전 09:00 (KST) |
| 실행 방식 | Vercel Cron → `POST /api/jobs/poll-tenders` |
| 수집 범위 | 오늘 기준 **최근 7일** 공고 (나라장터 검색 조건) |
| 1회 수집량 | 최대 **100건** |
| 실패 시 재시도 | 자동 **3회** 지수 백오프 |

### 2-2. 나라장터 API 호출

```
https://apis.data.go.kr/1230000/ad/BidPublicInfoService/getBidPblancListInfoServc
  ?inqryBgnDt=7일전0000   예) 202603030000
  ?inqryEndDt=오늘2359    예) 202603102359
  ?numOfRows=100
  ?inqryDiv=1             (용역/물품 통합 조회)
```

- 나라장터 운영계정 API KEY 필요 (`NARA_API_KEY` 환경변수)
- **한국 IP에서만 호출 가능** → Vercel 서울 리전(`icn1`) 고정

---

## 3. DB 저장 방식 — **upsert (추가+갱신)**

### 3-1. 핵심 원칙: 덮어쓰기가 아닌 upsert

`source_tender_id` (나라장터 공고번호)를 **중복 방지 키**로 사용합니다.

```
신규 공고번호   → INSERT (새 행 추가, created_at = 수집 시각)
기존 공고번호   → UPDATE (제목·예산·마감일 등 변경사항 반영)
```

즉, **기존 데이터는 지워지지 않고** 새 공고는 추가되며 기존 공고는 갱신됩니다.

### 3-2. 저장 필드 매핑

| DB 컬럼 | 나라장터 원본 필드 | 설명 |
|---------|-----------------|------|
| `source_tender_id` | `bidNtceNo` | 공고번호 (중복 방지 키) |
| `title` | `bidNtceNm` | 공고명 |
| `budget_amount` | `presmptPrce` | 예정가격 |
| `published_at` | `bidNtceDt` 또는 `rgstDt` | 공고일 (UTC 저장) |
| `deadline_at` | `bidClseDt` | 마감일 (UTC 저장) |
| `region_code/name` | `bidNtceAreaCd/Nm` | 지역 |
| `industry_code/name` | `prdctClsfcNo/Nm` | 업종 |
| `method_type` | `cntrctMthdCd` | 계약방법 |
| `status` | `bidClseDt` < 현재 시각 | OPEN / CLOSED 자동 판별 |
| **`raw_json`** | item 전체 | **나라장터 원본 JSON 무가공 저장** |
| `created_at` | (DB 자동) | 수집 시각 — 알림 판별에 사용 |

### 3-3. 날짜 처리 원칙

나라장터가 반환하는 날짜 형식은 `"2026-03-03 09:40:03"` (KST)입니다.

| 단계 | 처리 |
|------|------|
| DB 저장 (`published_at`) | `+09:00` 적용 후 UTC ISO 변환 → 정렬·필터 전용 |
| **화면 표시** | `raw_json.bidNtceDt` 원본값 직접 파싱 → **가공 없이 표시** |

> **고객 설명:** "화면에 보이는 날짜는 나라장터에서 그대로 가져온 값이며, 시스템이 임의로 변경하지 않습니다."

---

## 4. 기관(agencies) 저장

공고 1건당 발주 기관이 함께 저장됩니다.

- `agencies.code` (기관 코드)를 중복 방지 키로 upsert
- 새 기관이면 INSERT, 기존 기관이면 이름 UPDATE
- 공고 → 기관 외래키(`agency_id`)로 연결

---

## 5. 알림 발송 단계

```
KST 10:00 — process-alerts 실행
  ↓
최근 90분 이내 created_at 공고 조회  ← "오늘 새로 수집된 것"
  ↓
활성화된 alert_rules 순회
  ↓
키워드/지역/업종/예산 조건 매칭
  ↓
매칭 공고 → 이메일 발송 (Resend)
  ↓
alert_logs INSERT (중복 발송 DB 레벨 차단)
```

### 이메일 발송 케이스 3가지

| 케이스 | 조건 | 이메일 내용 |
|-------|------|-----------|
| 정상 알림 | 조건 매칭 공고 있음 | 공고 제목, 예산, 마감일, 상세 링크 |
| 공고 없음 | 오늘 수집된 공고 자체가 0건 | "오늘 신규 공고 없음" 안내 |
| 매칭 없음 | 공고는 있으나 조건 불일치 | "조건에 맞는 공고 없음" 안내 |

### 중복 발송 방지

- `alert_logs` 테이블에 `(alert_rule_id, tender_id)` UNIQUE 제약 적용
- 동일 (규칙 + 공고) 조합은 DB에서 자동 차단 → 재처리 시에도 중복 발송 없음

---

## 6. 시드(demo) 데이터란?

### 개요

시드 데이터는 실제 나라장터 API가 아닌 **개발·데모 목적으로 직접 입력한 가상 공고**입니다.

### 식별 방법

```sql
-- 시드 데이터 확인
SELECT id, source_tender_id, title, created_at
FROM public.tenders
WHERE source_tender_id LIKE 'DEMO-%';
```

| 구분 | 시드 데이터 | 실 데이터 |
|------|------------|---------|
| `source_tender_id` | `DEMO-2026-001` ~ `DEMO-2026-030` 형식 | 나라장터 공고번호 (숫자) |
| `raw_json` | NULL | 나라장터 원본 JSON |
| `published_at` | 스크립트 실행 시각 기준 상대값 | 나라장터 실제 공고일 |
| 발주 기관 코드 | `DEMO001` ~ `DEMO015` 형식 | 나라장터 기관 코드 |

### 시드 데이터 삭제 방법

> ⚠️ **주의:** 삭제 전 반드시 백업 또는 확인 후 실행하세요.

**Supabase SQL Editor에서 실행:**

```sql
-- 1단계: 시드 공고에 연결된 즐겨찾기 삭제
DELETE FROM public.favorites
WHERE tender_id IN (
  SELECT id FROM public.tenders WHERE source_tender_id LIKE 'DEMO-%'
);

-- 2단계: 시드 공고에 연결된 알림 로그 삭제
DELETE FROM public.alert_logs
WHERE tender_id IN (
  SELECT id FROM public.tenders WHERE source_tender_id LIKE 'DEMO-%'
);

-- 3단계: 시드 공고 삭제
DELETE FROM public.tenders
WHERE source_tender_id LIKE 'DEMO-%';

-- 4단계: 시드 기관 삭제 (DEMO 코드 기관만)
DELETE FROM public.agencies
WHERE code LIKE 'DEMO%';
```

**삭제 후 확인:**

```sql
SELECT COUNT(*) AS 남은_시드_공고
FROM public.tenders
WHERE source_tender_id LIKE 'DEMO-%';
-- 결과: 0 이면 완전 삭제됨
```

### 시드 데이터 재생성

```bash
# 프로젝트 루트에서 실행
node scripts/seed-demo.mjs
```

---

## 7. 실 데이터와 시드 데이터 공존 여부

**공존 가능합니다.** `source_tender_id`가 다르면 충돌 없이 공존합니다.

| 상황 | 결과 |
|------|------|
| 시드 데이터 유지 + 실 API 수집 | 두 종류 모두 목록에 표시됨 |
| 시드 데이터 삭제 후 실 API 수집 | 실 나라장터 데이터만 표시됨 (권장) |
| 실 API 수집 안 됨 | 시드 데이터만 표시됨 (개발/데모 환경) |

> **고객 설명:** "현재 목록에 보이는 데이터 중 일부는 시스템 초기 테스트용 가상 데이터입니다. 실제 서비스에서는 나라장터 공고만 표시됩니다."

---

## 8. 데이터 신뢰성 보장 구조

```
나라장터 원본 JSON
    └─ raw_json 컬럼에 통째로 저장 (수정 없음)
         └─ 화면 날짜 표시 시 raw_json.bidNtceDt 직접 사용
              └─ 서버 가공 없이 나라장터 값 그대로 표시
```

- `raw_json` 컬럼: 나라장터에서 받은 응답 원본 전체를 JSON으로 저장
- UI의 공고일·마감일: `raw_json` 필드 직접 파싱 → **나라장터 표시 값과 동일**
- 정렬·필터용 `published_at`: UTC 변환 저장 (내부 연산 전용, 화면 미표시)

---

## 9. 운영 점검 쿼리 모음

```sql
-- 전체 공고 수
SELECT COUNT(*) FROM public.tenders;

-- 실 데이터 vs 시드 데이터 현황
SELECT
  CASE WHEN source_tender_id LIKE 'DEMO-%' THEN '시드' ELSE '실데이터' END AS 구분,
  COUNT(*) AS 건수
FROM public.tenders
GROUP BY 1;

-- 오늘 수집된 실 데이터
SELECT title, published_at, created_at
FROM public.tenders
WHERE DATE(created_at AT TIME ZONE 'Asia/Seoul') = CURRENT_DATE
  AND source_tender_id NOT LIKE 'DEMO-%'
ORDER BY created_at DESC;

-- 최근 발송된 알림 로그
SELECT
  ar.name AS 규칙명,
  t.title AS 공고명,
  al.status,
  al.created_at AS 발송시각
FROM public.alert_logs al
JOIN public.alert_rules ar ON al.alert_rule_id = ar.id
JOIN public.tenders t ON al.tender_id = t.id
ORDER BY al.created_at DESC
LIMIT 20;
```

---

*문서 끝 — 업데이트 필요 시 `docs/DATA_PIPELINE.md` 수정*
