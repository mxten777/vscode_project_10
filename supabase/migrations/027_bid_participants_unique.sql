-- Migration 027: bid_participants UNIQUE constraint 추가
-- ON CONFLICT (notice_no, notice_ord, company_name, bid_rank) upsert를 위해 필요

-- 중복 데이터 먼저 정리 (같은 공고+업체+순위 중 가장 최근 1건 유지)
DELETE FROM public.bid_participants
WHERE id NOT IN (
  SELECT DISTINCT ON (notice_no, notice_ord, company_name, bid_rank) id
  FROM public.bid_participants
  ORDER BY notice_no, notice_ord, company_name, bid_rank, created_at DESC
);

-- UNIQUE constraint 추가
ALTER TABLE public.bid_participants
  ADD CONSTRAINT uq_bid_participants_notice_company_rank
  UNIQUE (notice_no, notice_ord, company_name, bid_rank);
