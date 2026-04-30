# API 명세서 (API Specification)

> AI 입찰·조달 분석 플랫폼 — REST API Reference  
> Base URL: `https://bid-platform.vercel.app/api`

---

## 공통 사항

### 인증 방식
- **Supabase Auth Cookie**: 브라우저 세션 쿠키 기반 JWT 자동 전송
- **Cron Jobs**: `Authorization: Bearer <CRON_SECRET>` 헤더

### 응답 형식

#### 성공 응답

성공 응답은 엔드포인트 성격에 따라 아래 셋 중 하나를 사용합니다.

- 리스트/페이지네이션 API: `data`, `total`, `page`, `pageSize`
- 단건/작업 API: 필요한 필드를 그대로 반환
- 단순 완료 응답: `message` 또는 `success` 포함 객체

```json
{
  "data": [...],
  "total": 100,    // PaginatedResponse인 경우
  "page": 1,
  "pageSize": 20
}
```

또는:

```json
{
  "success": true,
  "message": "작업 완료"
}
```

#### 에러 응답
```json
{
  "code": "ERROR_CODE",
  "message": "사람이 읽을 수 있는 메시지",
  "details": {}     // 선택적, 검증 에러 시 포함
}
```

### 공통 에러 코드

| HTTP Status | Code | 설명 |
|---|---|---|
| 400 | `VALIDATION_ERROR` | 입력 검증 실패 |
| 401 | `UNAUTHORIZED` | 인증 필요 또는 실패 |
| 403 | `FORBIDDEN` | 권한 없음 |
| 404 | `NOT_FOUND` | 리소스 없음 |
| 500 | `INTERNAL_ERROR` | 서버 내부 오류 |

---

## 1. 인증 (Auth)

### 1.1 회원가입

```
POST /api/auth/signup
```

**인증**: 불필요

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "password123",
  "orgName": "내 회사"          // 선택, 미입력 시 "{email}의 조직"
}
```

**Validation**:
| 필드 | 규칙 |
|---|---|
| `email` | `string`, 이메일 형식, 필수 |
| `password` | `string`, 6자 이상, 필수 |
| `orgName` | `string`, 1자 이상, 선택 |

**처리 로직**:
1. `supabase.auth.admin.createUser()` (서비스 롤)
2. `orgs` 테이블에 조직 생성
3. `org_members` 테이블에 `admin` 역할로 연결

**Response (201)**:
```json
{
  "message": "회원가입 완료",
  "userId": "uuid",
  "orgId": "uuid"
}
```

**에러 응답**:
| 상황 | Code | Status |
|---|---|---|
| email/password 누락 | `VALIDATION_ERROR` | 400 |
| 이미 가입된 이메일 | `AUTH_ERROR` | 400 |
| 조직 생성 실패 | `ORG_ERROR` | 500 |

---

### 1.2 로그인

```
POST /api/auth/signin
```

**인증**: 불필요

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Validation**:
| 필드 | 규칙 |
|---|---|
| `email` | `string`, 이메일 형식, 필수 |
| `password` | `string`, 1자 이상, 필수 |

**처리 로직**:
1. `supabase.auth.signInWithPassword()` (SSR 클라이언트, 쿠키 설정)

**Response (200)**:
```json
{
  "message": "로그인 성공",
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  }
}
```

**에러 응답**:
| 상황 | Code | Status |
|---|---|---|
| 잘못된 자격 증명 | `AUTH_ERROR` | 401 |

---

### 1.3 로그아웃

```
POST /api/auth/signout
```

**인증**: 필요 (세션 쿠키)

**처리 로직**:
1. `supabase.auth.signOut()`

**Response (200)**:
```json
{
  "message": "로그아웃 완료"
}
```

---

## 2. 공고 (Tenders)

### 2.1 공고 목록 조회

```
GET /api/tenders
```

**인증**: 불필요 (공개 데이터)

**Query Parameters**:

| 파라미터 | 타입 | 기본값 | 설명 |
|---|---|---|---|
| `q` | string | - | 제목 검색 (ilike `%q%`) |
| `status` | enum | - | `OPEN` \| `CLOSED` \| `RESULT` |
| `regionCode` | string | - | 지역 코드 |
| `industryCode` | string | - | 업종 분류 코드 |
| `budgetMin` | number | - | 최소 예산 (원) |
| `budgetMax` | number | - | 최대 예산 (원) |
| `agencyId` | uuid | - | 발주 기관 ID |
| `sortBy` | enum | `published_at` | `published_at` \| `deadline_at` \| `budget_amount` \| `created_at` |
| `sortOrder` | enum | `desc` | `asc` \| `desc` |
| `page` | int | 1 | 페이지 번호 (≥1) |
| `pageSize` | int | 20 | 페이지 크기 (1~100) |

**처리 로직**:
1. Zod `tenderSearchSchema`로 파라미터 검증
2. `countQuery` + `dataQuery`를 `Promise.all`로 병렬 실행
3. 데이터 쿼리: `tenders` JOIN `agencies`(FK), `awards`(FK)

**Response (200)**:
```json
{
  "data": [
    {
      "id": "uuid",
      "source_tender_id": "20240101001",
      "title": "서울시 정보시스템 구축",
      "agency_id": "uuid",
      "demand_agency_name": "서울시청",
      "budget_amount": 500000000,
      "region_code": "11",
      "region_name": "서울",
      "industry_code": "C001",
      "industry_name": "소프트웨어 개발",
      "method_type": "일반경쟁",
      "published_at": "2024-01-15T09:00:00Z",
      "deadline_at": "2024-02-15T18:00:00Z",
      "status": "OPEN",
      "raw_json": { ... },
      "created_at": "2024-01-15T10:00:00Z",
      "updated_at": "2024-01-15T10:00:00Z",
      "agency": {
        "id": "uuid",
        "code": "1234567",
        "name": "서울특별시"
      },
      "award": null
    }
  ],
  "total": 1523,
  "page": 1,
  "pageSize": 20
}
```

---

### 2.2 공고 상세 조회

```
GET /api/tenders/:id
```

**인증**: 선택적 (로그인 시 즐겨찾기 여부 포함)

**Path Parameters**:
| 파라미터 | 타입 | 설명 |
|---|---|---|
| `id` | uuid | 공고 ID |

**처리 로직**:
1. `tenders` JOIN `agencies`, `awards` 조회
2. 인증된 사용자: `favorites` 테이블에서 즐겨찾기 여부 확인

**Response (200)**:
```json
{
  "id": "uuid",
  "source_tender_id": "20240101001",
  "title": "서울시 정보시스템 구축",
  "agency": { "id": "uuid", "code": "1234567", "name": "서울특별시" },
  "award": {
    "id": "uuid",
    "winner_company_name": "A 시스템",
    "awarded_amount": 485000000,
    "awarded_rate": 97.0,
    "opened_at": "2024-02-20T14:00:00Z"
  },
  "is_favorited": true,
  "budget_amount": 500000000,
  "region_name": "서울",
  "industry_name": "소프트웨어 개발",
  "status": "RESULT",
  "published_at": "2024-01-15T09:00:00Z",
  "deadline_at": "2024-02-15T18:00:00Z",
  "raw_json": { ... }
}
```

**에러 응답**:
| 상황 | Code | Status |
|---|---|---|
| 존재하지 않는 공고 | `NOT_FOUND` | 404 |

---

## 3. 즐겨찾기 (Favorites)

### 3.1 즐겨찾기 목록

```
GET /api/favorites
```

**인증**: 필수

**처리 로직**:
1. `getAuthContext()` → 사용자 + 조직 확인
2. `favorites` JOIN `tenders` → `tenders.*`, `agency`, `award` 포함

**Response (200)**:
```json
[
  {
    "id": "uuid",
    "org_id": "uuid",
    "user_id": "uuid",
    "tender_id": "uuid",
    "created_at": "2024-01-20T10:00:00Z",
    "tender": {
      "id": "uuid",
      "title": "...",
      "status": "OPEN",
      "budget_amount": 100000000,
      ...
    }
  }
]
```

---

### 3.2 즐겨찾기 추가

```
POST /api/favorites/:tenderId
```

**인증**: 필수

**Path Parameters**:
| 파라미터 | 타입 | 설명 |
|---|---|---|
| `tenderId` | uuid | 대상 공고 ID |

**처리 로직**:
1. `getAuthContext()` → 인증 + 조직 확인
2. `supabase.from("favorites").upsert(...)` (onConflict: `user_id,tender_id`)
3. 이미 즐겨찾기된 경우에도 에러 없이 성공

**Response (201)**:
```json
{
  "id": "uuid",
  "org_id": "uuid",
  "user_id": "uuid",
  "tender_id": "uuid",
  "created_at": "2024-01-20T10:00:00Z"
}
```

---

### 3.3 즐겨찾기 제거

```
DELETE /api/favorites/:tenderId
```

**인증**: 필수

**Path Parameters**:
| 파라미터 | 타입 | 설명 |
|---|---|---|
| `tenderId` | uuid | 대상 공고 ID |

**처리 로직**:
1. `getAuthContext()` → 인증 확인
2. `supabase.from("favorites").delete()` WHERE `user_id` AND `tender_id`

**Response (200)**:
```json
{
  "message": "삭제 완료"
}
```

---

## 4. 알림 (Alerts)

### 4.1 알림 규칙 목록

```
GET /api/alerts/rules
```

**인증**: 필수

**Response (200)**:
```json
[
  {
    "id": "uuid",
    "org_id": "uuid",
    "user_id": "uuid",
    "type": "KEYWORD",
    "rule_json": {
      "keyword": "정보시스템",
      "regionCodes": ["11"],
      "budgetMin": 100000000
    },
    "channel": "EMAIL",
    "is_enabled": true,
    "created_at": "2024-01-10T00:00:00Z",
    "updated_at": "2024-01-10T00:00:00Z"
  }
]
```

---

### 4.2 알림 규칙 생성

```
POST /api/alerts/rules
```

**인증**: 필수

**Request Body**:
```json
{
  "type": "KEYWORD",
  "rule_json": {
    "keyword": "소프트웨어",
    "regionCodes": ["11", "26"],
    "budgetMin": 50000000,
    "budgetMax": 1000000000,
    "industryCodes": ["C001"]
  },
  "channel": "EMAIL",
  "is_enabled": true
}
```

**Validation (`alertRuleCreateSchema`)**:
| 필드 | 타입 | 기본값 | 설명 |
|---|---|---|---|
| `type` | `"KEYWORD"` \| `"FILTER"` | 필수 | 알림 유형 |
| `rule_json.keyword` | string | - | 키워드 매칭 |
| `rule_json.regionCodes` | string[] | - | 지역 코드 목록 |
| `rule_json.budgetMin` | number | - | 최소 예산 |
| `rule_json.budgetMax` | number | - | 최대 예산 |
| `rule_json.industryCodes` | string[] | - | 업종 코드 목록 |
| `channel` | `"EMAIL"` \| `"KAKAO"` | `"EMAIL"` | 알림 채널 |
| `is_enabled` | boolean | `true` | 활성 여부 |

**Response (201)**:
```json
{
  "id": "uuid",
  "org_id": "uuid",
  "user_id": "uuid",
  "type": "KEYWORD",
  "rule_json": { ... },
  "channel": "EMAIL",
  "is_enabled": true,
  "created_at": "...",
  "updated_at": "..."
}
```

---

### 4.3 알림 규칙 수정

```
PATCH /api/alerts/rules/:id
```

**인증**: 필수 (본인 규칙만 수정 가능)

**Path Parameters**:
| 파라미터 | 타입 | 설명 |
|---|---|---|
| `id` | uuid | 알림 규칙 ID |

**Request Body** (모든 필드 선택적):
```json
{
  "type": "FILTER",
  "rule_json": {
    "regionCodes": ["11"]
  },
  "channel": "KAKAO",
  "is_enabled": false
}
```

**Response (200)**:
```json
{
  "id": "uuid",
  "type": "FILTER",
  "rule_json": { "regionCodes": ["11"] },
  "channel": "KAKAO",
  "is_enabled": false,
  ...
}
```

---

### 4.4 알림 규칙 삭제

```
DELETE /api/alerts/rules/:id
```

**인증**: 필수 (본인 규칙만 삭제 가능)

**Response (200)**:
```json
{
  "message": "삭제 완료"
}
```

---

### 4.5 알림 발송 로그

```
GET /api/alerts/logs
```

**인증**: 필수

**처리 로직**:
1. 사용자의 `alert_rules` ID 목록 조회
2. 해당 규칙들의 `alert_logs` 조회 (최근 100건, 최신순)
3. `tender` 정보 JOIN

**Response (200)**:
```json
[
  {
    "id": "uuid",
    "alert_rule_id": "uuid",
    "tender_id": "uuid",
    "sent_at": "2024-01-20T12:00:00Z",
    "status": "SENT",
    "error_message": null,
    "tender": {
      "id": "uuid",
      "title": "서울시 정보시스템 구축",
      "status": "OPEN"
    }
  }
]
```

---

## 5. 저장 검색 (Saved Searches)

### 5.1 저장 검색 목록

```
GET /api/saved-searches
```

**인증**: 필수

**처리 로직**:
1. `getAuthContext()` 로 사용자와 `orgId` 확인
2. `saved_searches` 를 `org_id`, `user_id` 기준으로 최신순 조회
3. 최대 8개까지만 반환

**Response (200)**:
```json
[
  {
    "id": "uuid",
    "org_id": "uuid",
    "user_id": "uuid",
    "name": "서울 OPEN 공고",
    "query_json": {
      "keyword": "정보시스템",
      "statuses": ["OPEN"],
      "regionCodes": ["11"]
    },
    "created_at": "2026-04-30T00:00:00Z",
    "updated_at": "2026-04-30T00:00:00Z"
  }
]
```

### 5.2 저장 검색 생성

```
POST /api/saved-searches
```

**인증**: 필수

**Request Body**:
```json
{
  "name": "서울 OPEN 공고",
  "query_json": {
    "keyword": "정보시스템",
    "statuses": ["OPEN"],
    "regionCodes": ["11"]
  }
}
```

**에러 응답**:
| 상황 | Code | Status |
|---|---|---|
| 조직 없음 | `NO_ORG` | 400 |
| 입력 오류 | `VALIDATION_ERROR` | 400 |
| 최대 개수 초과 | `LIMIT_REACHED` | 400 |

### 5.3 저장 검색 수정

```
PATCH /api/saved-searches/:id
```

**인증**: 필수

**Request Body**:
```json
{
  "name": "서울/부산 진행 공고",
  "query_json": {
    "statuses": ["OPEN", "RESULT"],
    "regionCodes": ["11", "26"]
  }
}
```

### 5.4 저장 검색 삭제

```
DELETE /api/saved-searches/:id
```

**인증**: 필수

**Response (200)**:
```json
{
  "message": "저장한 검색 삭제 완료"
}
```

---

## 6. 리포트 (Reports)

### 5.1 요약 통계

```
GET /api/reports/summary
```

**인증**: 필수

**Query Parameters**:
| 파라미터 | 타입 | 설명 |
|---|---|---|
| `from` | ISO8601 datetime | 시작일 (선택) |
| `to` | ISO8601 datetime | 종료일 (선택) |

**처리 로직**:
1. `getAuthContext()` 로 인증 확인
2. `report_summary(from_date, to_date)` RPC 호출
3. RPC 결과를 그대로 반환

**Response (200)**:
```json
{
  "totalTenders": 1523,
  "totalBudget": 785000000000,
  "statusDistribution": [
    { "status": "OPEN", "count": 450 },
    { "status": "CLOSED", "count": 820 },
    { "status": "RESULT", "count": 253 }
  ],
  "topAgencies": [
    { "name": "서울특별시", "count": 87 },
    { "name": "한국도로공사", "count": 65 },
    ...
  ],
  "topIndustries": [
    { "name": "소프트웨어 개발", "count": 120 },
    { "name": "건설업", "count": 98 },
    ...
  ]
}
```

---

## 7. 배치 작업 (Jobs)

> 현재 운영 기준은 개별 job 직접 호출보다 `cron-ingest`, `cron-maintenance` 오케스트레이터 중심입니다.

### 7.1 수집 오케스트레이터 (Cron Ingest)

```
GET /api/jobs/cron-ingest
POST /api/jobs/cron-ingest
```

**인증**: `Authorization: Bearer <CRON_SECRET>` 필수

**스케줄**: 평일 00:00 UTC

**처리 로직**:
1. `poll-tenders?maxPages=3&lookbackDays=2` 실행
2. 성공 시 `collect-bid-awards?lookbackDays=2&maxPages=1&maxItems=25` 실행
3. step 결과를 순서대로 `results` 배열에 수집
4. 첫 실패가 발생하면 중단 후 `207` 반환

**Response (200/207)**:
```json
{
  "success": true,
  "ran_at": "2026-04-30T00:00:00.000Z",
  "mode": "cron-ingest",
  "results": [
    {
      "name": "poll-tenders",
      "path": "/api/jobs/poll-tenders?maxPages=3&lookbackDays=2",
      "ok": true,
      "status": 200,
      "body": {
        "message": "수집 완료"
      }
    }
  ]
}
```

---

### 7.2 유지보수 오케스트레이터 (Cron Maintenance)

```
GET /api/jobs/cron-maintenance
POST /api/jobs/cron-maintenance
```

**인증**: `Authorization: Bearer <CRON_SECRET>` 필수

**스케줄**: 매일 02:00 UTC

**처리 로직**:
1. 평일: `process-alerts` 포함
2. 매일: `rebuild-analysis`, `collect-participants` 실행
3. 월요일: `embed-batch` 추가
4. 일요일: `cleanup` 추가
5. 하나라도 실패하면 전체 상태 코드는 `207`

---

### 7.3 공고 수집 (Poll Tenders)

```
POST /api/jobs/poll-tenders
```

**인증**: `Authorization: Bearer <CRON_SECRET>` 필수

**처리 로직**:
1. `verifyCronSecret()` 검증
2. 나라장터 API 호출 (`retryWithBackoff`, 최대 3회, 지수 백오프)
   - endpoint: `/ad/BidPublicInfoService/getBidPblancListInfoServc` (운영계정)
   - params: `serviceKey`, `pageNo=1`, `numOfRows=100`, `type=json`, `inqryDiv=1`
   - 조회 기간: 전일 ~ 당일
3. 각 공고에 대해:
   - 기관 upsert (`agencies.code` UNIQUE)
   - 공고 upsert (`tenders.source_tender_id` UNIQUE)
   - 상태 결정: `bidClseDt` 기반으로 OPEN/CLOSED
4. 실패한 개별 건은 에러 카운트에 포함, 전체 배치는 계속 진행

**Response (200)**:
```json
{
  "message": "수집 완료",
  "totalFetched": 85,
  "totalCount": 85,
  "pagesProcessed": 1,
  "maxPages": 3,
  "lookbackDays": 2,
  "inserted": 12,
  "expiredClosed": 3
}
```

**에러 응답**:
| 상황 | Code | Status |
|---|---|---|
| 시크릿 키 불일치 | `UNAUTHORIZED` | 401 |
| 나라장터 API 장애 (3회 재시도 후) | `INTERNAL_ERROR` | 500 |

---

### 7.4 알림 처리 (Process Alerts)

```
POST /api/jobs/process-alerts
```

**인증**: `Authorization: Bearer <CRON_SECRET>` 필수

**처리 로직**:
1. `verifyCronSecret()` 검증
2. 활성화된 `alert_rules` 전체 조회 (`is_enabled = true`)
3. 최근 2시간 내 신규 공고 조회 (`created_at >= now() - 2h`)
4. 각 규칙에 대해 매칭 로직 실행:
  - 키워드: 공백 분리 OR 매칭
  - 상태: `statuses`
  - 필터: `regionCodes`, `industryCodes`, `budgetMin/Max`
5. 매칭된 공고에 대해:
   - `alert_logs`에서 기발송 여부 확인 (중복 방지)
   - `NotificationProvider.send()` 호출
   - `alert_logs`에 결과 기록 (`SENT` or `FAIL`)

**Response (200)**:
```json
{
  "message": "알림 처리 완료",
  "evaluated": 15,
  "sent": 3,
  "failed": 0
}
```

---

## 8. 헬스체크 (Health)

### 7.1 서버 상태 확인

```
GET /api/health
```

**인증**: 불필요

**Response (200)**:
```json
{
  "status": "ok",
  "timestamp": "2024-01-20T12:00:00.000Z"
}
```

---

## 8. 미들웨어 동작

### 보호 경로
| 경로 패턴 | 비인증 사용자 동작 |
|---|---|
| `/favorites/**` | → `/login?redirect=/favorites` |
| `/alerts/**` | → `/login?redirect=/alerts` |
| `/reports/**` | → `/login?redirect=/reports` |
| `/login` (인증 상태) | → `/` (메인으로 리다이렉트) |

### 세션 갱신
모든 요청에서 `supabase.auth.getUser()`를 호출하여 세션쿠키를 자동 갱신합니다.
