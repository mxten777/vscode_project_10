/**
 * 회사 프로파일 API
 * GET  /api/company-profile  — 현재 사용자 프로파일 조회
 * PUT  /api/company-profile  — 프로파일 생성 또는 업데이트
 */

import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { apiResponse } from "@/lib/api-response";
import { getAuthContext } from "@/lib/auth-context";

export async function GET() {
  try {
    const ctx = await getAuthContext();
    if ("error" in ctx) return ctx.error;

    const { user } = ctx;
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("company_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No rows — 프로파일 없음 (404 아닌 null 반환)
        return apiResponse.success(null);
      }
      console.error("[company-profile] GET error:", error);
      return apiResponse.error("Failed to fetch profile", 500);
    }

    return apiResponse.success(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[company-profile] GET exception:", err);
    return apiResponse.error(message);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const ctx = await getAuthContext();
    if ("error" in ctx) return ctx.error;

    const { user } = ctx;
    const body = await request.json();

    // 허용 필드만 추출 (입력 검증)
    const {
      company_name,
      industry_codes,
      region_codes,
      preferred_agency_names,
      min_budget,
      max_budget,
      keywords,
    } = body as {
      company_name?: string;
      industry_codes?: string[];
      region_codes?: string[];
      preferred_agency_names?: string[];
      min_budget?: number | null;
      max_budget?: number | null;
      keywords?: string[];
    };

    // 예산 검증 (최소 ≤ 최대)
    if (min_budget != null && max_budget != null && min_budget > max_budget) {
      return apiResponse.error("min_budget must be ≤ max_budget", 400);
    }

    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("company_profiles")
      .upsert(
        {
          user_id: user.id,
          ...(company_name !== undefined && { company_name }),
          ...(industry_codes !== undefined && {
            industry_codes: industry_codes ?? [],
          }),
          ...(region_codes !== undefined && {
            region_codes: region_codes ?? [],
          }),
          ...(preferred_agency_names !== undefined && {
            preferred_agency_names: preferred_agency_names ?? [],
          }),
          ...(min_budget !== undefined && { min_budget }),
          ...(max_budget !== undefined && { max_budget }),
          ...(keywords !== undefined && { keywords: keywords ?? [] }),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )
      .select()
      .single();

    if (error) {
      console.error("[company-profile] PUT error:", error);
      return apiResponse.error("Failed to save profile", 500);
    }

    return apiResponse.success(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[company-profile] PUT exception:", err);
    return apiResponse.error(message);
  }
}
