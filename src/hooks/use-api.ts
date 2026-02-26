"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  Tender,
  PaginatedResponse,
  Favorite,
  AlertRule,
  AlertLog,
  ReportSummary,
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
