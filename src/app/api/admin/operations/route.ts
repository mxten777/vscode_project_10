import { NextRequest } from "next/server";
import { z } from "zod";
import { errorResponse, forbiddenResponse, internalErrorResponse, successResponse } from "@/lib/api-response";
import { getAuthContext, type OrgPlan } from "@/lib/auth-context";
import { getIngestionStatus } from "@/lib/bid-intelligence-service";
import { canAccessOperationsConsole } from "@/lib/operations-access";
import { createServiceClient } from "@/lib/supabase/service";
import { getErrorMessage } from "@/lib/job-utils";

const ADMIN_ACTIONS = {
  "cron-ingest": { path: "/api/jobs/cron-ingest", method: "POST" },
  "cron-maintenance": { path: "/api/jobs/cron-maintenance", method: "POST" },
  "poll-tenders": { path: "/api/jobs/poll-tenders?maxPages=3&lookbackDays=2", method: "POST" },
  "collect-bid-awards": { path: "/api/jobs/collect-bid-awards?lookbackDays=2&maxPages=1&maxItems=25", method: "GET" },
  "process-alerts": { path: "/api/jobs/process-alerts", method: "POST" },
  "rebuild-analysis": { path: "/api/jobs/rebuild-analysis", method: "POST" },
  "collect-participants": { path: "/api/jobs/collect-participants?limit=200", method: "GET" },
  cleanup: { path: "/api/jobs/cleanup", method: "GET" },
} as const;

const runSchema = z.object({
  action: z.enum(Object.keys(ADMIN_ACTIONS) as [keyof typeof ADMIN_ACTIONS, ...(keyof typeof ADMIN_ACTIONS)[]]),
});

const organizationUpdateSchema = z
  .object({
    orgId: z.string().uuid("유효한 조직 ID가 필요합니다"),
    plan: z.enum(["free", "pro", "enterprise"]).optional(),
    name: z.string().trim().min(2, "조직명은 2자 이상이어야 합니다").max(80, "조직명은 80자 이하여야 합니다").optional(),
  })
  .refine((value) => value.plan !== undefined || value.name !== undefined, {
    message: "변경할 값이 필요합니다",
    path: ["orgId"],
  });

const memberUpdateSchema = z.object({
  orgId: z.string().uuid("유효한 조직 ID가 필요합니다"),
  userId: z.string().uuid("유효한 사용자 ID가 필요합니다"),
  role: z.enum(["admin", "member"]),
});

const memberDeleteSchema = z.object({
  orgId: z.string().uuid("유효한 조직 ID가 필요합니다"),
  userId: z.string().uuid("유효한 사용자 ID가 필요합니다"),
});

const invitationDeleteSchema = z.object({
  inviteId: z.string().uuid("유효한 초대 ID가 필요합니다"),
});

async function requireAdmin() {
  const ctx = await getAuthContext();
  if ("error" in ctx) return ctx;
  if (!canAccessOperationsConsole(ctx)) {
    return { error: forbiddenResponse("운영 콘솔 허용 계정만 접근할 수 있습니다") } as const;
  }
  return ctx;
}

type OrgRow = {
  id: string;
  name: string | null;
  plan: OrgPlan | null;
  created_at: string | null;
};

type OrgMemberRow = {
  org_id: string | null;
  user_id?: string | null;
  role: string | null;
  created_at?: string | null;
};

type InvitationRow = {
  id?: string | null;
  org_id: string | null;
  email?: string | null;
  role?: string | null;
  expires_at?: string | null;
  created_at?: string | null;
};

type SubscriptionRow = {
  org_id: string | null;
  plan: OrgPlan | null;
  status: string | null;
  stripe_cust_id: string | null;
  current_period_end: string | null;
};

type LogStatus = "all" | "running" | "success" | "failed";

type AdminUserSummary = {
  user_id: string;
  email: string;
  org_id: string | null;
  org_name: string | null;
  role: string | null;
  joined_at: string | null;
  last_sign_in_at: string | null;
  created_at: string | null;
};

function buildOrganizationSummaries(
  orgRows: OrgRow[],
  memberRows: OrgMemberRow[],
  invitationRows: InvitationRow[],
  subscriptionRows: SubscriptionRow[]
) {
  return orgRows.map((org) => {
    const orgMembers = memberRows.filter((member) => member.org_id === org.id);
    const orgInvitations = invitationRows.filter((invite) => invite.org_id === org.id);
    const subscription = subscriptionRows.find((row) => row.org_id === org.id) ?? null;
    const adminCount = orgMembers.filter((member) => member.role === "admin").length;

    return {
      id: org.id,
      name: org.name ?? "이름 없는 조직",
      plan: (org.plan ?? subscription?.plan ?? "free") as OrgPlan,
      created_at: org.created_at,
      member_count: orgMembers.length,
      admin_count: adminCount,
      pending_invitation_count: orgInvitations.length,
      subscription: subscription
        ? {
            plan: subscription.plan ?? "free",
            status: subscription.status ?? "active",
            has_stripe: Boolean(subscription.stripe_cust_id),
            current_period_end: subscription.current_period_end,
          }
        : null,
    };
  });
}

export async function GET(request: NextRequest) {
  const ctx = await requireAdmin();
  if ("error" in ctx) return ctx.error;

  const supabase = createServiceClient();

  try {
    const selectedStatus = (request.nextUrl.searchParams.get("logStatus") ?? "all") as LogStatus;
    const selectedJobType = request.nextUrl.searchParams.get("logJobType") ?? "all";
    const logLimitRaw = parseInt(request.nextUrl.searchParams.get("logLimit") ?? "8", 10);
    const logLimit = Number.isFinite(logLimitRaw) ? Math.min(Math.max(logLimitRaw, 1), 50) : 8;

    let logsQuery = supabase
      .from("collection_logs")
      .select("id, job_type, status, started_at, finished_at, created_at, records_collected, error_message")
      .order("started_at", { ascending: false })
      .limit(logLimit);

    if (selectedStatus !== "all") {
      logsQuery = logsQuery.eq("status", selectedStatus);
    }

    if (selectedJobType !== "all") {
      logsQuery = logsQuery.eq("job_type", selectedJobType);
    }

    const [status, orgsResult, memberCountResult, membersResult, invitesCountResult, invitesResult, subscriptionsResult, logsResult] = await Promise.all([
      getIngestionStatus(),
      supabase.from("orgs").select("id, name, plan, created_at", { count: "exact" }),
      supabase.from("org_members").select("user_id", { count: "exact", head: true }),
      supabase.from("org_members").select("org_id, user_id, role, created_at"),
      supabase
        .from("org_invitations")
        .select("id", { count: "exact", head: true })
        .gt("expires_at", new Date().toISOString()),
      supabase
        .from("org_invitations")
        .select("id, org_id, email, role, expires_at, created_at")
        .gt("expires_at", new Date().toISOString()),
      supabase
        .from("subscriptions")
        .select("org_id, plan, status, stripe_cust_id, current_period_end"),
      logsQuery,
    ]);
    const { data: authUsersData, error: authUsersError } = await supabase.auth.admin.listUsers();

    if (authUsersError) {
      return internalErrorResponse(`사용자 목록 조회 실패: ${authUsersError.message}`);
    }

    const orgRows = (orgsResult.data ?? []) as OrgRow[];
    const memberRows = (membersResult.data ?? []) as OrgMemberRow[];
    const planCounts = orgRows.reduce<Record<string, number>>((acc, org) => {
      const plan = typeof org.plan === "string" ? org.plan : "free";
      acc[plan] = (acc[plan] ?? 0) + 1;
      return acc;
    }, {});
    const organizations = buildOrganizationSummaries(
      orgRows,
      memberRows,
      (invitesResult.data ?? []) as InvitationRow[],
      (subscriptionsResult.data ?? []) as SubscriptionRow[]
    );
    const orgMap = new Map(orgRows.map((org) => [org.id, org]));
    const invitations = ((invitesResult.data ?? []) as InvitationRow[]).map((invite) => ({
      id: invite.id ?? "",
      org_id: invite.org_id,
      org_name: invite.org_id ? (orgMap.get(invite.org_id)?.name ?? null) : null,
      email: invite.email ?? "",
      role: invite.role ?? "member",
      expires_at: invite.expires_at ?? null,
      created_at: invite.created_at ?? null,
    }));
    const authUserMap = new Map((authUsersData?.users ?? []).map((user) => [user.id, user]));
    const users: AdminUserSummary[] = memberRows.map((member) => {
      const authUser = member.user_id ? authUserMap.get(member.user_id) : null;
      const org = member.org_id ? orgMap.get(member.org_id) : null;

      return {
        user_id: member.user_id ?? "",
        email: authUser?.email ?? "",
        org_id: member.org_id ?? null,
        org_name: org?.name ?? null,
        role: member.role ?? null,
        joined_at: member.created_at ?? null,
        last_sign_in_at: authUser?.last_sign_in_at ?? null,
        created_at: authUser?.created_at ?? null,
      };
    });

    return successResponse({
      status,
      metrics: {
        org_count: orgsResult.count ?? 0,
        member_count: memberCountResult.count ?? 0,
        pending_invitation_count: invitesCountResult.count ?? 0,
        running_job_count: status.running_jobs.length,
        recent_failure_count: status.recent_failures.length,
      },
      plan_counts: planCounts,
      organizations,
      users,
      invitations,
      log_filters: {
        status: selectedStatus,
        job_type: selectedJobType,
        limit: logLimit,
      },
      available_actions: Object.keys(ADMIN_ACTIONS),
      recent_logs: logsResult.data ?? [],
    });
  } catch (error) {
    return internalErrorResponse(getErrorMessage(error, "운영 콘솔 데이터를 불러오지 못했습니다"));
  }
}

export async function POST(request: NextRequest) {
  const ctx = await requireAdmin();
  if ("error" in ctx) return ctx.error;

  const parsed = runSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return errorResponse("INVALID_ACTION", parsed.error.issues[0]?.message ?? "잘못된 요청입니다", 400);
  }

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return internalErrorResponse("CRON_SECRET이 설정되지 않아 수동 실행을 시작할 수 없습니다");
  }

  const action = parsed.data.action;
  const target = ADMIN_ACTIONS[action];

  try {
    const response = await fetch(new URL(target.path, request.url), {
      method: target.method,
      headers: {
        authorization: `Bearer ${cronSecret}`,
      },
      cache: "no-store",
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      return errorResponse(
        "ADMIN_JOB_FAILED",
        payload?.message ?? `${action} 실행에 실패했습니다`,
        response.status,
        payload
      );
    }

    return successResponse(
      {
        action,
        message: `${action} 실행을 시작했습니다`,
        result: payload,
      },
      response.status
    );
  } catch (error) {
    return internalErrorResponse(getErrorMessage(error, `${action} 실행 중 오류가 발생했습니다`));
  }
}

export async function PATCH(request: NextRequest) {
  const ctx = await requireAdmin();
  if ("error" in ctx) return ctx.error;

  const parsed = organizationUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return errorResponse("INVALID_ORG_UPDATE", parsed.error.issues[0]?.message ?? "잘못된 요청입니다", 400);
  }

  const { orgId, plan, name } = parsed.data;
  const supabase = createServiceClient();

  try {
    const { data: org, error: orgLookupError } = await supabase
      .from("orgs")
      .select("id, name")
      .eq("id", orgId)
      .single();

    if (orgLookupError || !org) {
      return errorResponse("ORG_NOT_FOUND", "조직을 찾을 수 없습니다", 404);
    }

    const orgUpdatePayload: Record<string, unknown> = {};
    if (plan) orgUpdatePayload.plan = plan;
    if (name) orgUpdatePayload.name = name;

    const { error: orgUpdateError } = await supabase.from("orgs").update(orgUpdatePayload).eq("id", orgId);

    if (orgUpdateError) {
      return internalErrorResponse(`조직 업데이트 실패: ${orgUpdateError.message}`);
    }

    if (plan) {
      const { data: existingSubscription, error: subscriptionLookupError } = await supabase
        .from("subscriptions")
        .select("org_id, status, cancel_at_period_end, stripe_sub_id, stripe_cust_id, current_period_end")
        .eq("org_id", orgId)
        .maybeSingle();

      if (subscriptionLookupError) {
        return internalErrorResponse(`구독 정보 조회 실패: ${subscriptionLookupError.message}`);
      }

      const payload = existingSubscription
        ? {
            ...existingSubscription,
            plan,
          }
        : {
            org_id: orgId,
            plan,
            status: "active",
            cancel_at_period_end: false,
            stripe_sub_id: null,
            stripe_cust_id: null,
            current_period_end: null,
          };

      const { error: subscriptionUpsertError } = await supabase
        .from("subscriptions")
        .upsert(payload, { onConflict: "org_id" });

      if (subscriptionUpsertError) {
        return internalErrorResponse(`구독 상태 동기화 실패: ${subscriptionUpsertError.message}`);
      }
    }

    return successResponse({
      message: `${org.name ?? "조직"} 정보를 업데이트했습니다`,
      organization: {
        id: orgId,
        name: name ?? org.name,
        plan: plan ?? null,
      },
    });
  } catch (error) {
    return internalErrorResponse(getErrorMessage(error, "플랜 변경에 실패했습니다"));
  }
}

export async function PUT(request: NextRequest) {
  const ctx = await requireAdmin();
  if ("error" in ctx) return ctx.error;

  const parsed = memberUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return errorResponse("INVALID_MEMBER_UPDATE", parsed.error.issues[0]?.message ?? "잘못된 요청입니다", 400);
  }

  const { orgId, userId, role } = parsed.data;
  const supabase = createServiceClient();

  try {
    const { data: membership, error: membershipError } = await supabase
      .from("org_members")
      .select("user_id, role")
      .eq("org_id", orgId)
      .eq("user_id", userId)
      .maybeSingle();

    if (membershipError) {
      return internalErrorResponse(`멤버 조회 실패: ${membershipError.message}`);
    }

    if (!membership) {
      return errorResponse("MEMBER_NOT_FOUND", "조직 멤버를 찾을 수 없습니다", 404);
    }

    if (membership.role === "admin" && role !== "admin") {
      const { count, error: countError } = await supabase
        .from("org_members")
        .select("user_id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("role", "admin");

      if (countError) {
        return internalErrorResponse(`관리자 수 확인 실패: ${countError.message}`);
      }

      if ((count ?? 0) <= 1) {
        return errorResponse("LAST_ADMIN_PROTECTED", "마지막 관리자는 member로 변경할 수 없습니다", 409);
      }
    }

    const { error: updateError } = await supabase
      .from("org_members")
      .update({ role })
      .eq("org_id", orgId)
      .eq("user_id", userId);

    if (updateError) {
      return internalErrorResponse(`멤버 권한 변경 실패: ${updateError.message}`);
    }

    return successResponse({
      message: `멤버 권한을 ${role}로 변경했습니다`,
      membership: {
        org_id: orgId,
        user_id: userId,
        role,
      },
    });
  } catch (error) {
    return internalErrorResponse(getErrorMessage(error, "멤버 권한 변경에 실패했습니다"));
  }
}

export async function DELETE(request: NextRequest) {
  const ctx = await requireAdmin();
  if ("error" in ctx) return ctx.error;

  const payload = await request.json().catch(() => null);
  const inviteParsed = invitationDeleteSchema.safeParse(payload);
  if (inviteParsed.success) {
    const supabase = createServiceClient();
    const { inviteId } = inviteParsed.data;

    try {
      const { error: deleteError } = await supabase
        .from("org_invitations")
        .delete()
        .eq("id", inviteId);

      if (deleteError) {
        return internalErrorResponse(`초대 취소 실패: ${deleteError.message}`);
      }

      return successResponse({
        message: "대기 중인 초대를 취소했습니다",
        invitation: { id: inviteId },
      });
    } catch (error) {
      return internalErrorResponse(getErrorMessage(error, "초대 취소에 실패했습니다"));
    }
  }

  const parsed = memberDeleteSchema.safeParse(payload);
  if (!parsed.success) {
    return errorResponse("INVALID_MEMBER_DELETE", parsed.error.issues[0]?.message ?? "잘못된 요청입니다", 400);
  }

  const { orgId, userId } = parsed.data;
  const supabase = createServiceClient();

  try {
    const { data: membership, error: membershipError } = await supabase
      .from("org_members")
      .select("user_id, role")
      .eq("org_id", orgId)
      .eq("user_id", userId)
      .maybeSingle();

    if (membershipError) {
      return internalErrorResponse(`멤버 조회 실패: ${membershipError.message}`);
    }

    if (!membership) {
      return errorResponse("MEMBER_NOT_FOUND", "조직 멤버를 찾을 수 없습니다", 404);
    }

    if (membership.role === "admin") {
      const { count, error: countError } = await supabase
        .from("org_members")
        .select("user_id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("role", "admin");

      if (countError) {
        return internalErrorResponse(`관리자 수 확인 실패: ${countError.message}`);
      }

      if ((count ?? 0) <= 1) {
        return errorResponse("LAST_ADMIN_PROTECTED", "마지막 관리자는 제거할 수 없습니다", 409);
      }
    }

    const { error: deleteError } = await supabase
      .from("org_members")
      .delete()
      .eq("org_id", orgId)
      .eq("user_id", userId);

    if (deleteError) {
      return internalErrorResponse(`멤버 제거 실패: ${deleteError.message}`);
    }

    return successResponse({
      message: "멤버를 조직에서 제거했습니다",
      membership: {
        org_id: orgId,
        user_id: userId,
      },
    });
  } catch (error) {
    return internalErrorResponse(getErrorMessage(error, "멤버 제거에 실패했습니다"));
  }
}