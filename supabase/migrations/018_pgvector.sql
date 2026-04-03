-- 018: pgvector extension + tenders 임베딩 컬럼 + 유사도 검색 함수
-- 공고 제목을 768d 벡터로 저장 → 코사인 유사도 기반 유사 공고 검색

-- pgvector 확장 활성화
CREATE EXTENSION IF NOT EXISTS vector;

-- tenders에 임베딩 컬럼 추가 (MiniLM-L12: 768 dimensions)
ALTER TABLE tenders ADD COLUMN IF NOT EXISTS title_embedding vector(768);

-- IVFFlat 인덱스는 데이터가 충분히 쌓인 후 CONCURRENTLY로 생성
-- (데이터 1,000건 이상 권장, lists = sqrt(row_count) 설정)
-- CREATE INDEX CONCURRENTLY idx_tenders_embedding
--   ON tenders USING ivfflat (title_embedding vector_cosine_ops)
--   WITH (lists = 100);

-- pgvector 기반 유사 공고 검색 함수
CREATE OR REPLACE FUNCTION search_similar_tenders(
  query_embedding  vector(768),
  match_threshold  float    DEFAULT 0.7,
  match_count      int      DEFAULT 10,
  filter_status    text     DEFAULT NULL
)
RETURNS TABLE (
  id             uuid,
  title          text,
  agency_name    text,
  budget_amount  numeric,
  status         text,
  deadline_at    timestamptz,
  similarity     float
)
LANGUAGE sql STABLE AS $$
  SELECT
    t.id,
    t.title,
    a.name          AS agency_name,
    t.budget_amount,
    t.status,
    t.deadline_at,
    1 - (t.title_embedding <=> query_embedding) AS similarity
  FROM tenders t
  LEFT JOIN agencies a ON a.id = t.agency_id
  WHERE t.title_embedding IS NOT NULL
    AND 1 - (t.title_embedding <=> query_embedding) > match_threshold
    AND (filter_status IS NULL OR t.status = filter_status)
  ORDER BY t.title_embedding <=> query_embedding
  LIMIT match_count;
$$;

-- RLS: search_similar_tenders는 public read (기존 tenders 정책 상속)
GRANT EXECUTE ON FUNCTION search_similar_tenders TO anon, authenticated;
