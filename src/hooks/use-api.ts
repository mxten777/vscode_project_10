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
} from "@/lib/types";
import type { TenderSearchParams } from "@/lib/validations";

// ─── Fetch 유틸 ────────────────────────────────────────

async function fetcher<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Unknown error" }));
    throw new Error(err.message || `HTTP ${res.status}`);
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

