-- ============================================================================
-- Migration: 005_search_with_similarity.sql
-- 검색 고도화: pg_trgm similarity threshold 설정
-- ============================================================================

-- pg_trgm extension 확인 (이미 schema.sql에 있음)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- tenders 테이블의 title에 GIN 인덱스 추가 (이미 schema.sql에 있지만 확인)
CREATE INDEX IF NOT EXISTS idx_tenders_title_trgm ON tenders USING gin (title gin_trgm_ops);

-- tenders 테이블의 demand_agency_name에도 GIN 인덱스 추가 (검색 확장)
CREATE INDEX IF NOT EXISTS idx_tenders_demand_agency_name_trgm ON tenders USING gin (demand_agency_name gin_trgm_ops);

-- COMMENT
COMMENT ON INDEX idx_tenders_title_trgm IS 
  'pg_trgm GIN 인덱스: 제목 유사도 검색 성능 향상 (similarity, %, LIKE 연산자 가속)';

COMMENT ON INDEX idx_tenders_demand_agency_name_trgm IS 
  'pg_trgm GIN 인덱스: 수요기관명 유사도 검색 성능 향상';
