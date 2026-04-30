import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getAuthContextMock, createServiceClientMock, getIngestionStatusMock } = vi.hoisted(() => ({
  getAuthContextMock: vi.fn(),
  createServiceClientMock: vi.fn(),
  getIngestionStatusMock: vi.fn(),
}));

vi.mock("@/lib/auth-context", () => ({
  getAuthContext: getAuthContextMock,
}));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: createServiceClientMock,
}));

vi.mock("@/lib/bid-intelligence-service", () => ({
  getIngestionStatus: getIngestionStatusMock,
}));

import { DELETE as operationsDelete, GET as operationsGet, PATCH as operationsPatch, POST as operationsPost, PUT as operationsPut } from "@/app/api/admin/operations/route";

const OPERATIONS_ADMIN_EMAIL = "ops@example.com";
const ORG_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "22222222-2222-4222-8222-222222222222";
const INVITE_ID = "33333333-3333-4333-8333-333333333333";

function makeJsonRequest(body: unknown) {
  return {
    json: vi.fn().mockResolvedValue(body),
  };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

describe("admin operations route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ADMIN_CONSOLE_EMAILS = OPERATIONS_ADMIN_EMAIL;
  });

  afterEach(() => {
    delete process.env.ADMIN_CONSOLE_EMAILS;
  });

  it("allowlist에 없는 조직 admin 은 운영 콘솔 API 접근이 거부된다", async () => {
    getAuthContextMock.mockResolvedValue({
      role: "admin",
      user: { email: "org-admin@example.com" },
    });

    const response = await operationsDelete(makeJsonRequest({ inviteId: INVITE_ID }) as never);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      message: "운영 콘솔 허용 계정만 접근할 수 있습니다",
    });
  });

  it("allowlist 운영자는 대기 중 초대를 취소할 수 있다", async () => {
    const inviteDeleteEqMock = vi.fn().mockResolvedValue({ error: null });
    const inviteDeleteMock = vi.fn(() => ({ eq: inviteDeleteEqMock }));

    getAuthContextMock.mockResolvedValue({
      role: "admin",
      user: { email: OPERATIONS_ADMIN_EMAIL },
    });
    createServiceClientMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "org_invitations") {
          return {
            delete: inviteDeleteMock,
          };
        }

        throw new Error(`Unexpected table: ${table}`);
      }),
    });

    const response = await operationsDelete(makeJsonRequest({ inviteId: INVITE_ID }) as never);

    expect(inviteDeleteEqMock).toHaveBeenCalledWith("id", INVITE_ID);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      message: "대기 중인 초대를 취소했습니다",
      invitation: { id: INVITE_ID },
    });
  });

  it("운영 콘솔 GET 은 요약 지표와 조직·초대 목록을 함께 반환한다", async () => {
    const orgsSelectMock = vi.fn().mockResolvedValue({
      data: [
        {
          id: ORG_ID,
          name: "Baikal Labs",
          plan: "pro",
          created_at: "2026-04-01T00:00:00.000Z",
        },
      ],
      count: 1,
      error: null,
    });
    const membersSelectMock = vi
      .fn()
      .mockImplementationOnce(() => Promise.resolve({ count: 2, error: null }))
      .mockImplementationOnce(() =>
        Promise.resolve({
          data: [
            {
              org_id: ORG_ID,
              user_id: USER_ID,
              role: "admin",
              created_at: "2026-04-03T00:00:00.000Z",
            },
            {
              org_id: ORG_ID,
              user_id: "44444444-4444-4444-8444-444444444444",
              role: "member",
              created_at: "2026-04-04T00:00:00.000Z",
            },
          ],
          error: null,
        })
      );
    const invitesCountGtMock = vi.fn().mockResolvedValue({ count: 1, error: null });
    const invitesDataGtMock = vi.fn().mockResolvedValue({
      data: [
        {
          id: INVITE_ID,
          org_id: ORG_ID,
          email: "invitee@example.com",
          role: "member",
          expires_at: "2026-05-10T00:00:00.000Z",
          created_at: "2026-04-05T00:00:00.000Z",
        },
      ],
      error: null,
    });
    const invitesSelectMock = vi
      .fn()
      .mockImplementationOnce(() => ({ gt: invitesCountGtMock }))
      .mockImplementationOnce(() => ({ gt: invitesDataGtMock }));
    const subscriptionsSelectMock = vi.fn().mockResolvedValue({
      data: [
        {
          org_id: ORG_ID,
          plan: "pro",
          status: "active",
          stripe_cust_id: "cus_123",
          current_period_end: "2026-05-31T00:00:00.000Z",
        },
      ],
      error: null,
    });
    const logsLimitMock = vi.fn().mockResolvedValue({
      data: [
        {
          id: "log-1",
          job_type: "poll-tenders",
          status: "success",
          started_at: "2026-04-06T00:00:00.000Z",
          finished_at: "2026-04-06T00:01:00.000Z",
          created_at: "2026-04-06T00:00:00.000Z",
          records_collected: 12,
          error_message: null,
        },
      ],
      error: null,
    });
    const logsOrderMock = vi.fn(() => ({ limit: logsLimitMock }));
    const logsSelectMock = vi.fn(() => ({ order: logsOrderMock }));

    getAuthContextMock.mockResolvedValue({
      role: "admin",
      user: { email: OPERATIONS_ADMIN_EMAIL },
    });
    getIngestionStatusMock.mockResolvedValue({
      running_jobs: [{ job_type: "poll-tenders" }],
      recent_failures: [{ job_type: "cleanup" }],
    });
    createServiceClientMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "orgs") {
          return { select: orgsSelectMock };
        }

        if (table === "org_members") {
          return { select: membersSelectMock };
        }

        if (table === "org_invitations") {
          return { select: invitesSelectMock };
        }

        if (table === "subscriptions") {
          return { select: subscriptionsSelectMock };
        }

        if (table === "collection_logs") {
          return { select: logsSelectMock };
        }

        throw new Error(`Unexpected table: ${table}`);
      }),
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({
            data: {
              users: [
                {
                  id: USER_ID,
                  email: OPERATIONS_ADMIN_EMAIL,
                  last_sign_in_at: "2026-04-08T00:00:00.000Z",
                  created_at: "2026-04-01T00:00:00.000Z",
                },
              ],
            },
            error: null,
          }),
        },
      },
    });

    const response = await operationsGet({ nextUrl: new URL("https://example.com/api/admin/operations?logLimit=5") } as never);

    expect(logsLimitMock).toHaveBeenCalledWith(5);
    expect(response.status).toBe(200);
    const payload = await response.json();

    expect(payload).toMatchObject({
      metrics: {
        org_count: 1,
        member_count: 2,
        pending_invitation_count: 1,
        running_job_count: 1,
        recent_failure_count: 1,
      },
      plan_counts: { pro: 1 },
      log_filters: {
        status: "all",
        job_type: "all",
        limit: 5,
      },
      organizations: [
        {
          id: ORG_ID,
          name: "Baikal Labs",
          plan: "pro",
          member_count: 2,
          admin_count: 1,
          pending_invitation_count: 1,
        },
      ],
      invitations: [
        {
          id: INVITE_ID,
          org_id: ORG_ID,
          org_name: "Baikal Labs",
          email: "invitee@example.com",
          role: "member",
        },
      ],
      recent_logs: [
        {
          id: "log-1",
          job_type: "poll-tenders",
          status: "success",
        },
      ],
    });
    expect(payload.users).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          user_id: USER_ID,
          email: OPERATIONS_ADMIN_EMAIL,
          org_id: ORG_ID,
          org_name: "Baikal Labs",
          role: "admin",
        }),
        expect.objectContaining({
          user_id: "44444444-4444-4444-8444-444444444444",
          email: "",
          org_id: ORG_ID,
          org_name: "Baikal Labs",
          role: "member",
        }),
      ])
    );
  });

  it("플랜 변경 PATCH 는 org 와 subscription plan 을 함께 동기화한다", async () => {
    const orgLookupSingleMock = vi.fn().mockResolvedValue({
      data: { id: ORG_ID, name: "Baikal Labs" },
      error: null,
    });
    const orgLookupEqMock = vi.fn(() => ({ single: orgLookupSingleMock }));
    const orgSelectMock = vi.fn(() => ({ eq: orgLookupEqMock }));
    const orgUpdateEqMock = vi.fn().mockResolvedValue({ error: null });
    const orgUpdateMock = vi.fn(() => ({ eq: orgUpdateEqMock }));
    const subscriptionMaybeSingleMock = vi.fn().mockResolvedValue({
      data: {
        org_id: ORG_ID,
        status: "active",
        cancel_at_period_end: false,
        stripe_sub_id: "sub_123",
        stripe_cust_id: "cus_123",
        current_period_end: "2026-05-31T00:00:00.000Z",
      },
      error: null,
    });
    const subscriptionEqMock = vi.fn(() => ({ maybeSingle: subscriptionMaybeSingleMock }));
    const subscriptionSelectMock = vi.fn(() => ({ eq: subscriptionEqMock }));
    const subscriptionUpsertMock = vi.fn().mockResolvedValue({ error: null });

    getAuthContextMock.mockResolvedValue({
      role: "admin",
      user: { email: OPERATIONS_ADMIN_EMAIL },
    });
    createServiceClientMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "orgs") {
          return {
            select: orgSelectMock,
            update: orgUpdateMock,
          };
        }

        if (table === "subscriptions") {
          return {
            select: subscriptionSelectMock,
            upsert: subscriptionUpsertMock,
          };
        }

        throw new Error(`Unexpected table: ${table}`);
      }),
    });

    const response = await operationsPatch(
      makeJsonRequest({ orgId: ORG_ID, plan: "enterprise", name: "Baikal Enterprise" }) as never
    );

    expect(orgUpdateMock).toHaveBeenCalledWith({ name: "Baikal Enterprise", plan: "enterprise" });
    expect(subscriptionUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        org_id: ORG_ID,
        plan: "enterprise",
        status: "active",
        stripe_sub_id: "sub_123",
        stripe_cust_id: "cus_123",
      }),
      { onConflict: "org_id" }
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      message: "Baikal Labs 정보를 업데이트했습니다",
      organization: {
        id: ORG_ID,
        name: "Baikal Enterprise",
        plan: "enterprise",
      },
    });
  });

  it("CRON_SECRET 이 없으면 수동 job 실행 POST 는 500 을 반환한다", async () => {
    delete process.env.CRON_SECRET;

    getAuthContextMock.mockResolvedValue({
      role: "admin",
      user: { email: OPERATIONS_ADMIN_EMAIL },
    });

    const response = await operationsPost(
      {
        ...makeJsonRequest({ action: "cron-ingest" }),
        url: "https://example.com/api/admin/operations",
      } as never
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      code: "INTERNAL_ERROR",
      message: "CRON_SECRET이 설정되지 않아 수동 실행을 시작할 수 없습니다",
    });
  });

  it("수동 job 실행 POST 는 cron secret 헤더를 붙여 내부 job 을 호출한다", async () => {
    process.env.CRON_SECRET = "test-secret";
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse({ started: true }, 202));

    getAuthContextMock.mockResolvedValue({
      role: "admin",
      user: { email: OPERATIONS_ADMIN_EMAIL },
    });

    const response = await operationsPost(
      {
        ...makeJsonRequest({ action: "cron-ingest" }),
        url: "https://example.com/api/admin/operations",
      } as never
    );

    expect(fetchMock).toHaveBeenCalledWith(
      new URL("/api/jobs/cron-ingest", "https://example.com/api/admin/operations"),
      expect.objectContaining({
        method: "POST",
        headers: {
          authorization: "Bearer test-secret",
        },
        cache: "no-store",
      })
    );
    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({
      action: "cron-ingest",
      message: "cron-ingest 실행을 시작했습니다",
      result: { started: true },
    });
  });

  it("하위 job 실패 시 수동 job 실행 POST 는 상태와 메시지를 그대로 전달한다", async () => {
    process.env.CRON_SECRET = "test-secret";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({ message: "poll-tenders failed", detail: "timeout" }, 502)
    );

    getAuthContextMock.mockResolvedValue({
      role: "admin",
      user: { email: OPERATIONS_ADMIN_EMAIL },
    });

    const response = await operationsPost(
      {
        ...makeJsonRequest({ action: "poll-tenders" }),
        url: "https://example.com/api/admin/operations",
      } as never
    );

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({
      code: "ADMIN_JOB_FAILED",
      message: "poll-tenders failed",
      details: {
        message: "poll-tenders failed",
        detail: "timeout",
      },
    });
  });

  it("마지막 admin 을 member 로 내리려 하면 409 를 반환한다", async () => {
    const membershipMaybeSingleMock = vi.fn().mockResolvedValue({
      data: { user_id: USER_ID, role: "admin" },
      error: null,
    });
    const membershipEqUserMock = vi.fn(() => ({ maybeSingle: membershipMaybeSingleMock }));
    const membershipEqOrgMock = vi.fn(() => ({ eq: membershipEqUserMock }));
    const adminCountEqRoleMock = vi.fn().mockResolvedValue({ count: 1, error: null });
    const adminCountEqOrgMock = vi.fn(() => ({ eq: adminCountEqRoleMock }));
    const selectMock = vi
      .fn()
      .mockImplementationOnce(() => ({ eq: membershipEqOrgMock }))
      .mockImplementationOnce(() => ({ eq: adminCountEqOrgMock }));
    const updateMock = vi.fn();

    getAuthContextMock.mockResolvedValue({
      role: "admin",
      user: { email: OPERATIONS_ADMIN_EMAIL },
    });
    createServiceClientMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "org_members") {
          return {
            select: selectMock,
            update: updateMock,
          };
        }

        throw new Error(`Unexpected table: ${table}`);
      }),
    });

    const response = await operationsPut(
      makeJsonRequest({ orgId: ORG_ID, userId: USER_ID, role: "member" }) as never
    );

    expect(updateMock).not.toHaveBeenCalled();
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ code: "LAST_ADMIN_PROTECTED" });
  });

  it("마지막 admin 제거도 409 로 막는다", async () => {
    const membershipMaybeSingleMock = vi.fn().mockResolvedValue({
      data: { user_id: USER_ID, role: "admin" },
      error: null,
    });
    const membershipEqUserMock = vi.fn(() => ({ maybeSingle: membershipMaybeSingleMock }));
    const membershipEqOrgMock = vi.fn(() => ({ eq: membershipEqUserMock }));
    const adminCountEqRoleMock = vi.fn().mockResolvedValue({ count: 1, error: null });
    const adminCountEqOrgMock = vi.fn(() => ({ eq: adminCountEqRoleMock }));
    const selectMock = vi
      .fn()
      .mockImplementationOnce(() => ({ eq: membershipEqOrgMock }))
      .mockImplementationOnce(() => ({ eq: adminCountEqOrgMock }));
    const deleteMock = vi.fn();

    getAuthContextMock.mockResolvedValue({
      role: "admin",
      user: { email: OPERATIONS_ADMIN_EMAIL },
    });
    createServiceClientMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "org_members") {
          return {
            select: selectMock,
            delete: deleteMock,
          };
        }

        throw new Error(`Unexpected table: ${table}`);
      }),
    });

    const response = await operationsDelete(
      makeJsonRequest({ orgId: ORG_ID, userId: USER_ID }) as never
    );

    expect(deleteMock).not.toHaveBeenCalled();
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ code: "LAST_ADMIN_PROTECTED" });
  });
});