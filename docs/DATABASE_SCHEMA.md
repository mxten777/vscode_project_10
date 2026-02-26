# 데이터베이스 스키마 상세 문서

> AI 입찰·조달 분석 플랫폼 — Supabase Postgres Schema Reference
> 스키마 파일: `supabase/schema.sql`

---

## 1. ER 다이어그램 (텍스트)

```
                         ┌───────────┐
                         │ auth.users│ (Supabase 내장)
                         └─────┬─────┘
                               │ 1:N
                     ┌─────────┼─────────────────────┐
                     │         │                     │
              ┌──────▼──────┐  │              ┌──────▼──────┐
              │ org_members │  │              │ alert_rules │
              │             │  │              │             │
              │ org_id (FK) │  │              │ org_id (FK) │
              │ user_id(FK) │  │              │ user_id(FK) │
              └──────┬──────┘  │              └──────┬──────┘
                     │ N:1     │                     │ 1:N
              ┌──────▼──────┐  │              ┌──────▼──────┐
              │    orgs     │  │              │ alert_logs  │
              │             │  │              │             │
              │ plan        │  │              │ rule_id(FK) │
              └─────────────┘  │              │ tender_id(FK)│
                               │              └──────┬──────┘
                     ┌─────────▼──────┐              │
                     │   favorites    │              │
                     │                │              │
                     │ org_id (FK)    │              │
                     │ user_id (FK)   │              │
                     │ tender_id (FK) │              │
                     └────────┬───────┘              │
                              │                      │
                              │ N:1                   │ N:1
                     ┌────────▼─────────────────────▼──┐
                     │            tenders               │
                     │                                  │
                     │ source_tender_id (UNIQUE)        │
                     │ agency_id (FK) ──────────────┐   │
                     └──────────┬───────────────────┤   │
                                │ 1:1               │   │
                     ┌──────────▼──────┐    ┌───────▼───┐
                     │     awards      │    │ agencies  │
                     │                 │    │           │
                     │ tender_id (FK)  │    │ code (UQ) │
                     └─────────────────┘    └───────────┘
```

---

## 2. 확장 (Extensions)

| 확장명 | 용도 |
|---|---|
| `pgcrypto` | `gen_random_uuid()` — UUID v4 기본키 생성 |
| `pg_trgm` | 트리그램 기반 유사도 검색 (한국어 부분 매칭) |

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
```

---

## 3. 테이블 상세

### 3.1 `orgs` — 조직

> 멀티테넌시의 기본 단위. MVP에서는 1 User = 1 Org로 시작.

| 컬럼 | 타입 | NULL | 기본값 | 설명 |
|---|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` | PK |
| `name` | text | NOT NULL | - | 조직명 |
| `plan` | text | NOT NULL | `'free'` | 요금제 (`free`, `pro`, `enterprise`) |
| `created_at` | timestamptz | NOT NULL | `now()` | 생성 시각 |

**제약조건**:
- `CHECK (plan IN ('free','pro','enterprise'))`

**비고**: 향후 결제(Stripe) 연동 시 `plan` 필드로 기능 제한을 구현합니다.

---

### 3.2 `org_members` — 조직 멤버

> 사용자와 조직의 N:M 관계 (현재 1:1로 사용)

| 컬럼 | 타입 | NULL | 기본값 | 설명 |
|---|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` | PK |
| `org_id` | uuid | NOT NULL | - | FK → `orgs.id` |
| `user_id` | uuid | NOT NULL | - | FK → `auth.users.id` |
| `role` | text | NOT NULL | `'member'` | 역할 (`admin`, `member`) |
| `created_at` | timestamptz | NOT NULL | `now()` | 가입 시각 |

**제약조건**:
- `UNIQUE (org_id, user_id)` — 동일 조직에 중복 가입 방지
- `CHECK (role IN ('admin', 'member'))`
- `ON DELETE CASCADE` (orgs, auth.users)

---

### 3.3 `agencies` — 발주 기관

> 나라장터의 발주 기관 정보. `code` UNIQUE로 upsert 지원.

| 컬럼 | 타입 | NULL | 기본값 | 설명 |
|---|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` | PK |
| `code` | text | NOT NULL | - | 기관 코드 (UNIQUE) |
| `name` | text | NOT NULL | - | 기관명 |
| `raw_json` | jsonb | NULL | - | 원본 API 응답 전체 |
| `created_at` | timestamptz | NOT NULL | `now()` | 생성 시각 |
| `updated_at` | timestamptz | NOT NULL | `now()` | 수정 시각 (트리거 자동) |

**제약조건**:
- `UNIQUE (code)` — 기관 코드 중복 방지, upsert 기준

**트리거**:
- `trg_agencies_updated` → `set_updated_at()` (UPDATE 시 `updated_at` 자동 갱신)

---

### 3.4 `tenders` — 입찰 공고

> 핵심 도메인 테이블. 나라장터에서 수집한 입찰 공고 데이터.

| 컬럼 | 타입 | NULL | 기본값 | 설명 |
|---|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` | PK |
| `source_tender_id` | text | NOT NULL | - | 원본 공고 ID (UNIQUE) |
| `title` | text | NOT NULL | - | 공고명 |
| `agency_id` | uuid | NULL | - | FK → `agencies.id` |
| `demand_agency_name` | text | NULL | - | 수요 기관명 |
| `budget_amount` | numeric | NULL | - | 추정 가격 (원) |
| `region_code` | text | NULL | - | 지역 코드 |
| `region_name` | text | NULL | - | 지역명 |
| `industry_code` | text | NULL | - | 업종 분류 코드 |
| `industry_name` | text | NULL | - | 업종 분류명 |
| `method_type` | text | NULL | - | 계약 방법 (일반경쟁 등) |
| `published_at` | timestamptz | NULL | - | 공고일시 |
| `deadline_at` | timestamptz | NULL | - | 입찰 마감일시 |
| `status` | text | NOT NULL | `'OPEN'` | 상태 (`OPEN`, `CLOSED`, `RESULT`) |
| `raw_json` | jsonb | NULL | - | 원본 API 응답 전체 |
| `created_at` | timestamptz | NOT NULL | `now()` | 수집 시각 |
| `updated_at` | timestamptz | NOT NULL | `now()` | 수정 시각 (트리거 자동) |

**제약조건**:
- `UNIQUE (source_tender_id)` — 중복 수집 방지, upsert 기준
- `CHECK (status IN ('OPEN', 'CLOSED', 'RESULT'))`

**트리거**:
- `trg_tenders_updated` → `set_updated_at()`

---

### 3.5 `awards` — 개찰/낙찰 결과

> 공고와 1:1 관계 (MVP). 개찰 결과 데이터.

| 컬럼 | 타입 | NULL | 기본값 | 설명 |
|---|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` | PK |
| `tender_id` | uuid | NOT NULL | - | FK → `tenders.id` (UNIQUE) |
| `winner_company_name` | text | NULL | - | 낙찰 업체명 |
| `awarded_amount` | numeric | NULL | - | 낙찰 금액 (원) |
| `awarded_rate` | numeric | NULL | - | 낙찰률 (%) |
| `opened_at` | timestamptz | NULL | - | 개찰일시 |
| `raw_json` | jsonb | NULL | - | 원본 API 응답 |
| `created_at` | timestamptz | NOT NULL | `now()` | 생성 시각 |
| `updated_at` | timestamptz | NOT NULL | `now()` | 수정 시각 (트리거 자동) |

**제약조건**:
- `UNIQUE (tender_id)` — 1:1 관계 보장
- `ON DELETE CASCADE` (tenders 삭제 시 함께 삭제)

**트리거**:
- `trg_awards_updated` → `set_updated_at()`

---

### 3.6 `favorites` — 즐겨찾기

> 사용자가 관심 공고를 저장하는 테이블.

| 컬럼 | 타입 | NULL | 기본값 | 설명 |
|---|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` | PK |
| `org_id` | uuid | NOT NULL | - | FK → `orgs.id` |
| `user_id` | uuid | NOT NULL | - | FK → `auth.users.id` |
| `tender_id` | uuid | NOT NULL | - | FK → `tenders.id` |
| `created_at` | timestamptz | NOT NULL | `now()` | 저장 시각 |

**제약조건**:
- `UNIQUE (user_id, tender_id)` — 동일 공고 중복 즐겨찾기 방지, upsert 기준
- `ON DELETE CASCADE` (orgs, auth.users, tenders)

---

### 3.7 `alert_rules` — 알림 규칙

> 사용자가 설정한 맞춤 알림 조건.

| 컬럼 | 타입 | NULL | 기본값 | 설명 |
|---|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` | PK |
| `org_id` | uuid | NOT NULL | - | FK → `orgs.id` |
| `user_id` | uuid | NOT NULL | - | FK → `auth.users.id` |
| `type` | text | NOT NULL | - | 유형 (`KEYWORD`, `FILTER`) |
| `rule_json` | jsonb | NOT NULL | `'{}'` | 규칙 상세 JSON |
| `channel` | text | NOT NULL | `'EMAIL'` | 알림 채널 (`EMAIL`, `KAKAO`) |
| `is_enabled` | boolean | NOT NULL | `true` | 활성 여부 |
| `created_at` | timestamptz | NOT NULL | `now()` | 생성 시각 |
| `updated_at` | timestamptz | NOT NULL | `now()` | 수정 시각 (트리거 자동) |

**제약조건**:
- `CHECK (type IN ('KEYWORD', 'FILTER'))`
- `CHECK (channel IN ('EMAIL', 'KAKAO'))`
- `ON DELETE CASCADE` (orgs, auth.users)

**`rule_json` 스키마**:
```json
{
  "keyword": "string (선택)",
  "regionCodes": ["string[] (선택)"],
  "budgetMin": "number (선택)",
  "budgetMax": "number (선택)",
  "industryCodes": ["string[] (선택)"]
}
```

**트리거**:
- `trg_alert_rules_updated` → `set_updated_at()`

---

### 3.8 `alert_logs` — 알림 발송 로그

> 알림 발송 이력 추적. 중복 발송 방지에도 활용.

| 컬럼 | 타입 | NULL | 기본값 | 설명 |
|---|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` | PK |
| `alert_rule_id` | uuid | NOT NULL | - | FK → `alert_rules.id` |
| `tender_id` | uuid | NOT NULL | - | FK → `tenders.id` |
| `sent_at` | timestamptz | NOT NULL | `now()` | 발송 시각 |
| `status` | text | NOT NULL | - | 발송 상태 (`SENT`, `FAIL`) |
| `error_message` | text | NULL | - | 실패 시 에러 메시지 |

**제약조건**:
- `CHECK (status IN ('SENT', 'FAIL'))`
- `ON DELETE CASCADE` (alert_rules, tenders)

---

## 4. 인덱스 전략

### 4.1 B-tree 인덱스 (기본 조회 최적화)

| 인덱스명 | 테이블 | 컬럼 | 용도 |
|---|---|---|---|
| `idx_tenders_deadline` | tenders | `deadline_at` | 마감일 정렬/필터 |
| `idx_tenders_published` | tenders | `published_at` | 공고일 정렬/필터 |
| `idx_tenders_status` | tenders | `status` | 상태 필터 |
| `idx_tenders_agency` | tenders | `agency_id` | 기관별 조회 |
| `idx_tenders_region` | tenders | `region_code` | 지역 필터 |
| `idx_tenders_industry` | tenders | `industry_code` | 업종 필터 |
| `idx_tenders_budget` | tenders | `budget_amount` | 예산 범위 필터 |
| `idx_favorites_user` | favorites | `user_id` | 사용자별 즐겨찾기 |
| `idx_favorites_org` | favorites | `org_id` | 조직별 즐겨찾기 |
| `idx_alert_rules_user` | alert_rules | `user_id` | 사용자별 알림 규칙 |
| `idx_alert_logs_rule` | alert_logs | `alert_rule_id` | 규칙별 로그 조회 |

### 4.2 GIN 인덱스 (트리그램 검색)

| 인덱스명 | 테이블 | 컬럼 | 용도 |
|---|---|---|---|
| `idx_tenders_title_trgm` | tenders | `title gin_trgm_ops` | 제목 LIKE/유사도 검색 가속 |

**작동 원리**:
- `pg_trgm`은 텍스트를 3글자 단위(트리그램)로 분해하여 GIN 인덱스에 저장
- `ILIKE '%검색어%'` 쿼리를 인덱스 스캔으로 처리 (전체 테이블 스캔 방지)
- 한국어도 지원 (유니코드 문자 기반 트리그램)

---

## 5. RLS (Row Level Security) 정책

### 5.1 헬퍼 함수

```sql
CREATE OR REPLACE FUNCTION public.user_org_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT org_id FROM public.org_members WHERE user_id = auth.uid();
$$;
```

- `auth.uid()`: Supabase Auth JWT에서 현재 사용자 ID 추출
- `SECURITY DEFINER`: 함수를 정의한 사용자 권한으로 실행 (org_members 접근 보장)
- `STABLE`: 동일 트랜잭션 내 동일 결과 보장 (쿼리 최적화)

### 5.2 정책 요약

| 테이블 | 정책명 | 동작 | 조건 |
|---|---|---|---|
| `orgs` | `orgs_select_own` | SELECT | `id IN user_org_ids()` |
| `org_members` | `org_members_select_own` | SELECT | `org_id IN user_org_ids()` |
| `agencies` | `agencies_select_all` | SELECT | `true` (전체 공개) |
| `tenders` | `tenders_select_all` | SELECT | `true` (전체 공개) |
| `awards` | `awards_select_all` | SELECT | `true` (전체 공개) |
| `favorites` | `favorites_select_own` | SELECT | `org_id IN user_org_ids()` |
| `favorites` | `favorites_insert_own` | INSERT | `org_id IN user_org_ids() AND user_id = auth.uid()` |
| `favorites` | `favorites_delete_own` | DELETE | `user_id = auth.uid()` |
| `alert_rules` | `alert_rules_select_own` | SELECT | `org_id IN user_org_ids()` |
| `alert_rules` | `alert_rules_insert_own` | INSERT | `org_id IN user_org_ids() AND user_id = auth.uid()` |
| `alert_rules` | `alert_rules_update_own` | UPDATE | `user_id = auth.uid()` |
| `alert_logs` | `alert_logs_select_own` | SELECT | `alert_rule_id IN (SELECT id FROM alert_rules WHERE org_id IN user_org_ids())` |

### 5.3 RLS 설계 원칙

1. **공개 데이터** (agencies, tenders, awards): 전체 SELECT 허용
2. **사용자 데이터** (favorites, alert_rules): 조직 범위로 격리
3. **INSERT/DELETE**: `user_id = auth.uid()` 추가 검증 (본인만)
4. **Service Role**: Cron Jobs에서 사용, RLS 완전 우회

---

## 6. 트리거

### 6.1 `set_updated_at()` 함수

```sql
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
```

### 6.2 적용 대상

| 트리거명 | 테이블 | 이벤트 | 설명 |
|---|---|---|---|
| `trg_agencies_updated` | agencies | BEFORE UPDATE | `updated_at` 자동 갱신 |
| `trg_tenders_updated` | tenders | BEFORE UPDATE | `updated_at` 자동 갱신 |
| `trg_awards_updated` | awards | BEFORE UPDATE | `updated_at` 자동 갱신 |
| `trg_alert_rules_updated` | alert_rules | BEFORE UPDATE | `updated_at` 자동 갱신 |

---

## 7. 데이터 흐름

### 7.1 공고 수집 → 저장

```
나라장터 API Response
  │
  ├─ item.dminsttCd / ntceInsttCd  →  agencies.code (UPSERT)
  ├─ item.bidNtceNo                →  tenders.source_tender_id (UPSERT)
  ├─ item.bidNtceNm                →  tenders.title
  ├─ item.presmptPrce              →  tenders.budget_amount
  ├─ item.bidNtceAreaCd/Nm         →  tenders.region_code/name
  ├─ item.prdctClsfcNo/Nm          →  tenders.industry_code/name
  ├─ item.bidClseDt                →  tenders.deadline_at + status 결정
  └─ 전체 item                      →  tenders.raw_json (원본 보관)
```

### 7.2 알림 매칭 로직

```
alert_rule.type == "KEYWORD"
  → tender.title.includes(rule_json.keyword)

rule_json.regionCodes 존재
  → tender.region_code IN regionCodes

rule_json.industryCodes 존재
  → tender.industry_code IN industryCodes

rule_json.budgetMin/Max 존재
  → budgetMin ≤ tender.budget_amount ≤ budgetMax

모든 조건 AND 결합
```

---

## 8. 마이그레이션 가이드

### 8.1 초기 설정 (Supabase SQL Editor에서 실행)

1. Supabase Dashboard → SQL Editor 열기
2. `supabase/schema.sql` 전체 내용 복붙
3. **Run** 클릭
4. Table Editor에서 8개 테이블 생성 확인

### 8.2 스키마 변경 관리 (권장)

MVP 이후 스키마 변경 시:
```bash
# Supabase CLI 설치 후
supabase migration new <migration-name>
# 생성된 파일에 ALTER/CREATE 구문 작성
supabase db push
```

### 8.3 데이터 초기화 (개발 환경)

```sql
-- 주의: 모든 데이터 삭제
TRUNCATE public.alert_logs CASCADE;
TRUNCATE public.alert_rules CASCADE;
TRUNCATE public.favorites CASCADE;
TRUNCATE public.awards CASCADE;
TRUNCATE public.tenders CASCADE;
TRUNCATE public.agencies CASCADE;
TRUNCATE public.org_members CASCADE;
TRUNCATE public.orgs CASCADE;
```
