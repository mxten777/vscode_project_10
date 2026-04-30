"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  Tender,
  PaginatedResponse,
  Favorite,
  AlertRule,
  AlertLog,
  ReportSummary,
  BidRecommendation,
  SimilarBid,
  AIInsights,
  CompanyProfile,
  CompanyProfileInput,
  SavedSearch,
  SavedSearchInput,
  SavedSearchUpdateInput,
} from "@/lib/types";
import type { DashboardSummary, IngestionStatus } from "@/lib/bid-intelligence-service";
import type { TenderSearchParams } from "@/lib/validations";

// ─── Fetch 유틸 ────────────────────────────────────────

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

async function fetcher<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Unknown error" }));
    throw new ApiError(err.message || `HTTP ${res.status}`, res.status, err.code);
  }
  return res.json();
}

function buildQueryString(params: Record<string, unknown>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== "") sp.set(k, String(v));
  }
  return sp.toString();
}

// ─── Tenders ───────────────────────────────────────────

export interface TenderSummary {
  total: number;
  open_count: number;
  urgent_count: number;
  closing_today: number;
  total_budget: number;
  open_budget: number;
}

export function useTenderSummary() {
  return useQuery<TenderSummary>({
    queryKey: ["tenders", "summary"],
    queryFn: () => fetcher("/api/tenders/summary"),
    staleTime: 60 * 1000, // 1분 캐시
  });
}

export function useTenders(params: Partial<TenderSearchParams>) {
  const qs = buildQueryString(params);
  return useQuery<PaginatedResponse<Tender>>({
    queryKey: ["tenders", qs],
    queryFn: () => fetcher(`/api/tenders?${qs}`),
  });
}

export function useTender(id: string | undefined) {
  return useQuery<Tender>({
    queryKey: ["tenders", id],
    queryFn: () => fetcher(`/api/tenders/${id}`),
    enabled: !!id,
  });
}

export interface BidParticipant {
  id: string;
  tender_id: string;
  notice_no: string;
  notice_ord: string;
  company_name: string;
  bid_rank: number | null;
  bid_amount: number | null;
  bid_rate: number | null;
  is_winner: boolean;
  created_at: string;
}

export interface TenderParticipantsResult {
  participants: BidParticipant[];
  data_quality: "real" | "partial" | "insufficient";
  analysis_level: 1 | 2 | 3;
  participant_count?: number | null;
  message?: string;
  source: "cache" | "live" | "none";
}

export function useTenderParticipants(tenderId: string | undefined, enabled = true) {
  return useQuery<TenderParticipantsResult>({
    queryKey: ["tender-participants", tenderId],
    queryFn: () => fetcher(`/api/tenders/${tenderId}/participants`),
    enabled: !!tenderId && enabled,
    staleTime: 1000 * 60 * 15, // 15분 캐시 (온디맨드 수집이므로 짧게)
    retry: false,
  });
}

// ─── Favorites ─────────────────────────────────────────

export function useFavorites() {
  return useQuery<Favorite[]>({
    queryKey: ["favorites"],
    queryFn: () => fetcher("/api/favorites"),
  });
}

export function useToggleFavorite() {
  const qc = useQueryClient();

  const addMutation = useMutation({
    mutationFn: (tenderId: string) =>
      fetcher(`/api/favorites/${tenderId}`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["favorites"] });
      qc.invalidateQueries({ queryKey: ["tenders"] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (tenderId: string) =>
      fetcher(`/api/favorites/${tenderId}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["favorites"] });
      qc.invalidateQueries({ queryKey: ["tenders"] });
    },
  });

  return { addFavorite: addMutation, removeFavorite: removeMutation };
}

// ─── Alerts ────────────────────────────────────────────

export function useAlertRules() {
  return useQuery<AlertRule[]>({
    queryKey: ["alert-rules"],
    queryFn: () => fetcher("/api/alerts/rules"),
  });
}

export function useCreateAlertRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      fetcher("/api/alerts/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alert-rules"] }),
  });
}

export function useUpdateAlertRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      fetcher(`/api/alerts/rules/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alert-rules"] }),
  });
}

export function useDeleteAlertRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetcher(`/api/alerts/rules/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alert-rules"] }),
  });
}

export function useAlertLogs() {
  return useQuery<AlertLog[]>({
    queryKey: ["alert-logs"],
    queryFn: () => fetcher("/api/alerts/logs"),
  });
}

export function useSavedSearches() {
  return useQuery<SavedSearch[]>({
    queryKey: ["saved-searches"],
    queryFn: () => fetcher("/api/saved-searches"),
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateSavedSearch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: SavedSearchInput) =>
      fetcher<SavedSearch>("/api/saved-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saved-searches"] });
    },
  });
}

export function useDeleteSavedSearch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetcher(`/api/saved-searches/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saved-searches"] });
    },
  });
}

export function useUpdateSavedSearch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & SavedSearchUpdateInput) =>
      fetcher<SavedSearch>(`/api/saved-searches/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saved-searches"] });
    },
  });
}

// ─── Reports ───────────────────────────────────────────

export function useReportSummary(from?: string, to?: string) {
  const qs = buildQueryString({ from, to });
  return useQuery<ReportSummary>({
    queryKey: ["report-summary", qs],
    queryFn: () => fetcher(`/api/reports/summary?${qs}`),
  });
}

// ─── Bid Intelligence ──────────────────────────────────

export function useBidRecommendation(tenderId: string | undefined) {
  return useQuery<BidRecommendation>({
    queryKey: ["bid-recommendation", tenderId],
    queryFn: () => fetcher(`/api/bid-analysis/recommend?tenderId=${tenderId}`),
    enabled: !!tenderId,
    staleTime: 1000 * 60 * 30, // 30분 캐시 (서버에서 24시간 캐시되므로)
  });
}

export function useSimilarBids(tenderId: string | undefined, limit?: number) {
  const qs = buildQueryString({ tenderId: tenderId || "", limit: limit || 20 });
  return useQuery<{
    total: number;
    items: SimilarBid[];
    grouped: { high: SimilarBid[]; medium: SimilarBid[]; low: SimilarBid[] };
    summary: { high_similarity: number; medium_similarity: number; low_similarity: number };
  }>({
    queryKey: ["similar-bids", qs],
    queryFn: () => fetcher(`/api/bid-analysis/similar?${qs}`),
    enabled: !!tenderId,
    staleTime: 1000 * 60 * 15, // 15분 캐시
  });
}

export function useBidAnalytics(
  type?: "overall" | "agency" | "industry" | "region",
  value?: string,
  months?: number
) {
  const qs = buildQueryString({ type, value, months });
  return useQuery<Record<string, unknown>>({
    queryKey: ["bid-analytics", qs],
    queryFn: () => fetcher(`/api/bid-analysis/stats?${qs}`),
    staleTime: 1000 * 60 * 60, // 1시간 캐시 (통계는 자주 변하지 않음)
  });
}

export function useAIInsights(limit = 8) {
  return useQuery<AIInsights>({
    queryKey: ["ai-insights", limit],
    queryFn: () => fetcher(`/api/bid-analysis/insights?limit=${limit}`),
    staleTime: 1000 * 60 * 60 * 6, // 6시간 캐시
    retry: 1,
  });
}

// ─── Company Profile ───────────────────────────────────

export function useCompanyProfile() {
  return useQuery<CompanyProfile | null>({
    queryKey: ["company-profile"],
    queryFn: async () => {
      const res = await fetch("/api/company-profile");
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    staleTime: 1000 * 60 * 5, // 5분 캐시
    retry: false,
  });
}

export function useUpdateCompanyProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<CompanyProfileInput>) =>
      fetcher<CompanyProfile>("/api/company-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["company-profile"] });
      // 프로파일 변경 시 AI 인사이트 캐시 무효화
      qc.invalidateQueries({ queryKey: ["ai-insights"] });
    },
  });
}

// ─── Dashboard Summary (실데이터) ──────────────────────

export function useDashboardSummary() {
  return useQuery<{ data: DashboardSummary | null; quality: string; computed_at: string }>({
    queryKey: ["dashboard-summary"],
    queryFn: () => fetcher("/api/dashboard/summary"),
    staleTime: 1000 * 60 * 5, // 5분 캐시
  });
}

// ─── Ingestion Status (운영 상태) ──────────────────────

export function useIngestionStatus() {
  return useQuery<IngestionStatus>({
    queryKey: ["ingestion-status"],
    queryFn: () => fetcher("/api/dashboard/ingestion-status"),
    staleTime: 1000 * 60 * 2, // 2분 캐시 (운영 상태는 자주 조회)
    retry: false,
  });
}

// ─── 분석 캐시 (기관/업종/지역) ──────────────────────────

export interface AnalysisEntry {
  // name 필드 - 타입에 따라 하나만 존재
  agency_code?: string;
  agency_name?: string;
  industry_code?: string;
  industry_name?: string;
  region_code?: string;
  region_name?: string;
  data_quality: "real" | "partial" | "insufficient";
  avg_award_rate: number | null;
  avg_participants: number | null;
  total_results: number;
  avg_budget: number | null;
  updated_at: string;
}

export function useAnalysisByType(type: "agency" | "industry" | "region", limit = 20) {
  return useQuery<{ data: AnalysisEntry[] | null; quality: string; message?: string; total?: number }>({
    queryKey: ["analysis", type, limit],
    queryFn: () => fetcher(`/api/analysis/${type}?limit=${limit}`),
    staleTime: 1000 * 60 * 60, // 1시간 캐시
  });
}

// ─── 트렌딩 키워드 (실데이터) ────────────────────────────

export function useTrendingKeywords(days = 7, limit = 10) {
  return useQuery<Array<{ keyword: string; count: number; type: string }>>({
    queryKey: ["trending-keywords", days, limit],
    queryFn: async () => {
      const res = await fetch(`/api/bid-analysis/trending?days=${days}&limit=${limit}`);
      if (!res.ok) return [];
      const json = await res.json();
      return json?.data ?? [];
    },
    staleTime: 1000 * 60 * 30, // 30분 캐시
    retry: false,
  });
}
