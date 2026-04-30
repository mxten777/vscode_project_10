/**
 * bid-intelligence-service.ts
 * 나라장터 실데이터 기반 AI 입찰 분석 서비스
 *
 * 모든 함수는:
 * - 실제 Supabase 연결
 * - null-safe 처리
 * - 데이터 부족 시 명확한 상태 반환
 */

import { createServiceClient } from "@/lib/supabase/service";

// ─── 공통 타입 ────────────────────────────────────────────────────────────────

export type DataQuality = "real" | "partial" | "insufficient";

export interface AnalysisResult<T> {
  data: T | null;
  quality: DataQuality;
  message?: string;
  computed_at: string;
  /** 전체 레코드 수 (limit에 관계없이 실제 총 개수) */
  total?: number;
}

export interface DashboardSummary {
  tender_stats: {
    open_count: number;
    closed_count: number;
    result_count: number;
    new_today: number;
    new_this_week: number;
    total_count: number;
  };
  award_stats: {
    total_awards: number;
    avg_award_rate: number | null;
    total_awarded_amount: number | null;
    awards_with_participants: number;
    avg_participants: number | null;
  };
  collection_status: {
    last_tender_collection: string | null;
    last_award_collection: string | null;
    recent_failures: number;
  };
  data_coverage: {
    agencies_real: number;
    industries_real: number;
    regions_real: number;
    awards_with_participants: number;
  };
  computed_at: string;
}

export interface IngestionStatus {
  tenders: {
    last_started_at: string | null;
    last_success_at: string | null;
    last_failure_at: string | null;
    recent_count: number;
    failure_count_24h: number;
    last_error: string | null;
    is_running: boolean;
  };
  awards: {
    last_started_at: string | null;
    last_success_at: string | null;
    last_failure_at: string | null;
    recent_count: number;
    failure_count_24h: number;
    last_error: string | null;
    is_running: boolean;
  };
  analysis: {
    last_started_at: string | null;
    last_success_at: string | null;
    last_failure_at: string | null;
    recent_count: number;
    failure_count_24h: number;
    last_error: string | null;
    is_running: boolean;
  };
  alerts: {
    last_started_at: string | null;
    last_success_at: string | null;
    last_failure_at: string | null;
    recent_count: number;
    failure_count_24h: number;
    last_error: string | null;
    is_running: boolean;
  };
  participants: {
    last_started_at: string | null;
    last_success_at: string | null;
    last_failure_at: string | null;
    recent_count: number;
    failure_count_24h: number;
    last_error: string | null;
    is_running: boolean;
  };
  cleanup: {
    last_started_at: string | null;
    last_success_at: string | null;
    last_failure_at: string | null;
    recent_count: number;
    failure_count_24h: number;
    last_error: string | null;
    is_running: boolean;
  };
  running_jobs: string[];
  recent_failures: Array<{
    job_type: string;
    at: string | null;
    message: string | null;
  }>;
  analysis_last_rebuilt: string | null;
  computed_at: string;
  system_ok: boolean;
}

type CollectionLogRow = {
  job_type: string | null;
  status: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string | null;
  records_collected: number | null;
  error_message: string | null;
};

type JobSummary = IngestionStatus["tenders"];

const SUCCESS_STATUSES = new Set(["success", "completed"]);
const FAILURE_STATUSES = new Set(["failed"]);
const RUNNING_STATUSES = new Set(["running", "started"]);

function normalizeStatus(status: string | null | undefined) {
  return (status ?? "").toLowerCase();
}

function rowTimestamp(row: CollectionLogRow) {
  return row.finished_at ?? row.started_at ?? row.created_at ?? null;
}

function rowStartedAt(row: CollectionLogRow) {
  return row.started_at ?? row.created_at ?? null;
}

function isWithinHours(iso: string | null, hours: number) {
  if (!iso) return false;

  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return false;

  return Date.now() - parsed <= hours * 60 * 60 * 1000;
}

function emptyJobSummary(): JobSummary {
  return {
    last_started_at: null,
    last_success_at: null,
    last_failure_at: null,
    recent_count: 0,
    failure_count_24h: 0,
    last_error: null,
    is_running: false,
  };
}

function buildJobSummary(rows: CollectionLogRow[], jobTypes: string[]): JobSummary {
  const relevantRows = rows.filter((row) => row.job_type && jobTypes.includes(row.job_type));
  if (relevantRows.length === 0) return emptyJobSummary();

  const successRow = relevantRows.find((row) => SUCCESS_STATUSES.has(normalizeStatus(row.status)));
  const failureRow = relevantRows.find((row) => FAILURE_STATUSES.has(normalizeStatus(row.status)));
  const recentRows = relevantRows.filter((row) => isWithinHours(rowStartedAt(row), 24));

  return {
    last_started_at: rowStartedAt(relevantRows[0]),
    last_success_at: successRow ? rowTimestamp(successRow) : null,
    last_failure_at: failureRow ? rowTimestamp(failureRow) : null,
    recent_count: recentRows
      .filter((row) => SUCCESS_STATUSES.has(normalizeStatus(row.status)))
      .reduce((sum, row) => sum + (row.records_collected ?? 0), 0),
    failure_count_24h: recentRows.filter((row) => FAILURE_STATUSES.has(normalizeStatus(row.status))).length,
    last_error: failureRow?.error_message ?? null,
    is_running: relevantRows.some((row) => RUNNING_STATUSES.has(normalizeStatus(row.status))),
  };
}

export interface AgencyAnalysis {
  agency_code: string;
  agency_name: string;
  avg_award_rate: number | null;
  avg_participants: number | null;
  total_notices: number;
  total_results: number;
  avg_budget: number | null;
  data_quality: DataQuality;
  updated_at: string;
}

export interface IndustryAnalysis {
  industry_code: string;
  industry_name: string;
  avg_award_rate: number | null;
  avg_participants: number | null;
  total_results: number;
  avg_budget: number | null;
  data_quality: DataQuality;
  updated_at: string;
}

export interface RegionAnalysis {
  region_code: string;
  region_name: string;
  avg_award_rate: number | null;
  avg_participants: number | null;
  total_results: number;
  avg_budget: number | null;
  data_quality: DataQuality;
  updated_at: string;
}

// ─── 대시보드 집계 ────────────────────────────────────────────────────────────

/**
 * 대시보드 KPI 집계 (실데이터 전용)
 */
export async function getDashboardSummary(): Promise<AnalysisResult<DashboardSummary>> {
  const supabase = createServiceClient();

  try {
    const { data, error } = await supabase.rpc("get_dashboard_summary");
    if (error) throw error;

    return {
      data: data as DashboardSummary,
      quality: "real",
      computed_at: new Date().toISOString(),
    };
  } catch (err) {
    console.error("[getDashboardSummary]", err);
    return {
      data: null,
      quality: "insufficient",
      message: "집계 실패. 잠시 후 다시 시도해주세요.",
      computed_at: new Date().toISOString(),
    };
  }
}

// ─── 운영 상태 ────────────────────────────────────────────────────────────────

/**
 * 수집 파이프라인 운영 상태 조회
 * UI의 "운영 상태 카드"에서 사용
 */
export async function getIngestionStatus(): Promise<IngestionStatus> {
  const supabase = createServiceClient();

  try {
    const { data, error } = await supabase
      .from("collection_logs")
      .select("job_type,status,started_at,finished_at,created_at,records_collected,error_message")
      .order("started_at", { ascending: false })
      .limit(200);

    if (error) throw error;

    const rows = (data ?? []) as CollectionLogRow[];
    const tenders = buildJobSummary(rows, ["tenders"]);
    const awards = buildJobSummary(rows, ["awards"]);
    const analysis = buildJobSummary(rows, ["analysis_rebuild"]);
    const alerts = buildJobSummary(rows, ["alerts"]);
    const participants = buildJobSummary(rows, ["participants"]);
    const cleanup = buildJobSummary(rows, ["cleanup"]);
    const runningJobs = Array.from(
      new Set(
        rows
          .filter((row) => RUNNING_STATUSES.has(normalizeStatus(row.status)))
          .map((row) => row.job_type)
          .filter((jobType): jobType is string => Boolean(jobType))
      )
    );
    const recentFailures = rows
      .filter((row) => FAILURE_STATUSES.has(normalizeStatus(row.status)) && isWithinHours(rowStartedAt(row), 24))
      .slice(0, 5)
      .map((row) => ({
        job_type: row.job_type ?? "unknown",
        at: rowTimestamp(row),
        message: row.error_message ?? null,
      }));
    const tenderOk = tenders.failure_count_24h === 0;
    const awardsOk = awards.failure_count_24h === 0;

    return {
      tenders,
      awards,
      analysis,
      alerts,
      participants,
      cleanup,
      running_jobs: runningJobs,
      recent_failures: recentFailures,
      analysis_last_rebuilt: analysis.last_success_at,
      computed_at: new Date().toISOString(),
      system_ok: tenderOk && awardsOk,
    };
  } catch {
    return {
      tenders: {
        last_started_at: null,
        last_success_at: null,
        last_failure_at: null,
        recent_count: 0,
        failure_count_24h: 0,
        last_error: null,
        is_running: false,
      },
      awards: {
        last_started_at: null,
        last_success_at: null,
        last_failure_at: null,
        recent_count: 0,
        failure_count_24h: 0,
        last_error: null,
        is_running: false,
      },
      analysis: {
        last_started_at: null,
        last_success_at: null,
        last_failure_at: null,
        recent_count: 0,
        failure_count_24h: 0,
        last_error: null,
        is_running: false,
      },
      alerts: {
        last_started_at: null,
        last_success_at: null,
        last_failure_at: null,
        recent_count: 0,
        failure_count_24h: 0,
        last_error: null,
        is_running: false,
      },
      participants: {
        last_started_at: null,
        last_success_at: null,
        last_failure_at: null,
        recent_count: 0,
        failure_count_24h: 0,
        last_error: null,
        is_running: false,
      },
      cleanup: {
        last_started_at: null,
        last_success_at: null,
        last_failure_at: null,
        recent_count: 0,
        failure_count_24h: 0,
        last_error: null,
        is_running: false,
      },
      running_jobs: [],
      recent_failures: [],
      analysis_last_rebuilt: null,
      computed_at: new Date().toISOString(),
      system_ok: false,
    };
  }
}

// ─── AI 추천 공고 ─────────────────────────────────────────────────────────────

/**
 * AI 추천 공고 4개 카테고리
 * - recommended: 최종 종합 추천
 * - high_probability: 낙찰 가능성 높음
 * - low_competition: 경쟁 적은 공고
 * - high_profitability: 수익성 높은 공고
 */
export async function getAiRecommendations(
  userId?: string | null,
  limit = 8
): Promise<AnalysisResult<Record<string, unknown>>> {
  const supabase = createServiceClient();

  let profile: Record<string, unknown> | null = null;
  if (userId) {
    const { data: cp } = await supabase
      .from("company_profiles")
      .select("industry_codes, region_codes, preferred_agency_names, min_budget, max_budget")
      .eq("user_id", userId)
      .maybeSingle();
    profile = cp ?? null;
  }

  const { data, error } = await supabase.rpc("get_ai_insights_v2", {
    p_limit: limit,
    p_user_id: userId ?? null,
    p_industry_codes: (profile?.industry_codes as string[]) ?? null,
    p_region_codes: (profile?.region_codes as string[]) ?? null,
    p_agency_names: (profile?.preferred_agency_names as string[]) ?? null,
    p_min_budget: (profile?.min_budget as number) ?? null,
    p_max_budget: (profile?.max_budget as number) ?? null,
  });

  if (error) {
    return {
      data: null,
      quality: "insufficient",
      message: "추천 계산 중 오류. AI 분석 서버 상태를 확인해주세요.",
      computed_at: new Date().toISOString(),
    };
  }

  const result = data as Record<string, unknown>;
  const coverage = result?.coverage as Record<string, number> | undefined;
  const awardsCount = coverage?.awards_count ?? 0;
  const quality: DataQuality =
    awardsCount >= 100 ? "real" : awardsCount >= 20 ? "partial" : "insufficient";

  return {
    data: result,
    quality,
    computed_at: new Date().toISOString(),
  };
}

// ─── 분석 조회 ────────────────────────────────────────────────────────────────

/**
 * 기관별 분석 (캐시 테이블 우선, 없으면 insufficient 반환)
 */
export async function getAgencyAnalysis(
  limit = 20
): Promise<AnalysisResult<AgencyAnalysis[]>> {
  const supabase = createServiceClient();

  const [{ data, error }, { count: totalCount }] = await Promise.all([
    supabase
      .from("agency_analysis")
      .select("*")
      .order("total_results", { ascending: false })
      .limit(limit),
    supabase
      .from("agency_analysis")
      .select("*", { count: "exact", head: true }),
  ]);

  if (error || !data || data.length === 0) {
    return {
      data: null,
      quality: "insufficient",
      message: "기관 분석 데이터가 아직 없습니다. 분석 재구성 후 이용 가능합니다.",
      computed_at: new Date().toISOString(),
      total: 0,
    };
  }

  const realCount = data.filter((d) => d.data_quality === "real").length;
  const quality: DataQuality =
    realCount >= data.length * 0.5 ? "real" : realCount > 0 ? "partial" : "insufficient";

  return { data, quality, computed_at: new Date().toISOString(), total: totalCount ?? data.length };
}

/**
 * 업종별 분석
 */
export async function getIndustryAnalysis(
  limit = 20
): Promise<AnalysisResult<IndustryAnalysis[]>> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("industry_analysis")
    .select("*")
    .order("total_results", { ascending: false })
    .limit(limit);

  if (error || !data || data.length === 0) {
    return {
      data: null,
      quality: "insufficient",
      message: "업종 분석 데이터가 아직 없습니다.",
      computed_at: new Date().toISOString(),
    };
  }

  const realCount = data.filter((d) => d.data_quality === "real").length;
  const quality: DataQuality =
    realCount >= data.length * 0.5 ? "real" : realCount > 0 ? "partial" : "insufficient";

  return { data, quality, computed_at: new Date().toISOString() };
}

/**
 * 지역별 분석
 */
export async function getRegionAnalysis(
  limit = 20
): Promise<AnalysisResult<RegionAnalysis[]>> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("region_analysis")
    .select("*")
    .order("total_results", { ascending: false })
    .limit(limit);

  if (error || !data || data.length === 0) {
    return {
      data: null,
      quality: "insufficient",
      message: "지역 분석 데이터가 아직 없습니다.",
      computed_at: new Date().toISOString(),
    };
  }

  const realCount = data.filter((d) => d.data_quality === "real").length;
  const quality: DataQuality =
    realCount >= data.length * 0.5 ? "real" : realCount > 0 ? "partial" : "insufficient";

  return { data, quality, computed_at: new Date().toISOString() };
}

// ─── 트렌딩 키워드 ────────────────────────────────────────────────────────────

/**
 * 최근 N일 실데이터 기준 트렌딩 키워드 (업종명 빈도 기반)
 */
export async function getTrendingKeywords(
  days = 7,
  limit = 10
): Promise<Array<{ keyword: string; count: number; type: string }>> {
  const supabase = createServiceClient();

  const { data, error } = await supabase.rpc("get_trending_keywords", {
    p_days: days,
    p_limit: limit,
  });

  if (error || !data) return [];
  return data as Array<{ keyword: string; count: number; type: string }>;
}
