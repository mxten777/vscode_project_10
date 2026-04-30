import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  getAuthContextMock,
  createServiceClientMock,
  createServerClientMock,
  getStripeMock,
} = vi.hoisted(() => ({
  getAuthContextMock: vi.fn(),
  createServiceClientMock: vi.fn(),
  createServerClientMock: vi.fn(),
  getStripeMock: vi.fn(),
}));

vi.mock("@/lib/auth-context", () => ({
  PLAN_LIMITS: {
    free: { alertRules: 3, favorites: 50 },
    pro: { alertRules: 50, favorites: Infinity },
    enterprise: { alertRules: Infinity, favorites: Infinity },
  },
  getAuthContext: getAuthContextMock,
}));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: createServiceClientMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: createServerClientMock,
}));

vi.mock("@/lib/stripe", () => ({
  STRIPE_PRICES: {
    pro_monthly: "price_pro",
    enterprise_monthly: "price_enterprise",
  },
  getStripe: getStripeMock,
}));

import { GET as favoritesGet } from "@/app/api/favorites/route";
import { POST as favoritesPost } from "@/app/api/favorites/[tenderId]/route";
import { POST as checkoutPost } from "@/app/api/billing/checkout/route";
import { POST as signupPost } from "@/app/api/auth/signup/route";
import { GET as companyProfileGet } from "@/app/api/company-profile/route";
import { GET as reportsSummaryGet } from "@/app/api/reports/summary/route";
import { GET as savedSearchesGet, POST as savedSearchesPost } from "@/app/api/saved-searches/route";
import { PATCH as savedSearchesPatch } from "@/app/api/saved-searches/[id]/route";
import { GET as tendersGet } from "@/app/api/tenders/route";
import { GET as teamInvitesGet, POST as teamInvitePost } from "@/app/api/team/invite/route";
import { POST as teamAcceptPost } from "@/app/api/team/accept/route";

vi.mock("@/lib/notifications/email-provider", () => ({
  EmailProvider: class {
    send = vi.fn().mockResolvedValue({ success: true });
  },
}));

function makeJsonRequest(body: unknown) {
  return {
    json: vi.fn().mockResolvedValue(body),
  };
}

function makeUrlRequest(url: string) {
  return { url };
}

function createThenableQuery<T extends object>(result: T) {
  const query: Record<string, unknown> = {
    then: (resolve: (value: T) => unknown) => Promise.resolve(resolve(result)),
    catch: () => Promise.resolve(result),
  };

  for (const method of ["or", "eq", "gte", "lte", "order", "range"]) {
    query[method] = vi.fn(() => query);
  }

  return query as {
    or: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    gte: ReturnType<typeof vi.fn>;
    lte: ReturnType<typeof vi.fn>;
    order: ReturnType<typeof vi.fn>;
    range: ReturnType<typeof vi.fn>;
    then: (resolve: (value: T) => unknown) => Promise<unknown>;
    catch: () => Promise<T>;
  };
}

describe("favorites route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("free 플랜 한도 도달 시 403 반환", async () => {
    const countEqUserMock = vi.fn().mockResolvedValue({ count: 50 });
    const countEqOrgMock = vi.fn(() => ({
      eq: countEqUserMock,
    }));
    const selectMock = vi.fn(() => ({
      eq: countEqOrgMock,
    }));

    getAuthContextMock.mockResolvedValue({
      supabase: {
        from: vi.fn(() => ({
          select: selectMock,
        })),
      },
      user: { id: "user-1" },
      orgId: "org-1",
      plan: "free",
    });

    const response = await favoritesPost(
      {} as never,
      { params: Promise.resolve({ tenderId: "tender-1" }) }
    );

    expect(countEqOrgMock).toHaveBeenCalledWith("org_id", "org-1");
    expect(countEqUserMock).toHaveBeenCalledWith("user_id", "user-1");
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ code: "PLAN_LIMIT" });
  });

  it("한도 미도달 시 즐겨찾기 upsert 후 201 반환", async () => {
    const singleMock = vi.fn().mockResolvedValue({
      data: { tender_id: "tender-1", user_id: "user-1" },
      error: null,
    });
    const selectAfterUpsertMock = vi.fn(() => ({ single: singleMock }));
    const upsertMock = vi.fn(() => ({ select: selectAfterUpsertMock }));

    getAuthContextMock.mockResolvedValue({
      supabase: {
        from: vi.fn((table: string) => {
          if (table === "favorites") {
            const countEqUserMock = vi.fn().mockResolvedValue({ count: 10 });
            const countEqOrgMock = vi.fn(() => ({ eq: countEqUserMock }));
            return {
              select: vi.fn(() => ({ eq: countEqOrgMock })),
              upsert: upsertMock,
            };
          }
          throw new Error(`Unexpected table: ${table}`);
        }),
      },
      user: { id: "user-1" },
      orgId: "org-1",
      plan: "free",
    });

    const response = await favoritesPost(
      {} as never,
      { params: Promise.resolve({ tenderId: "tender-1" }) }
    );

    expect(upsertMock).toHaveBeenCalledWith(
      {
        org_id: "org-1",
        user_id: "user-1",
        tender_id: "tender-1",
      },
      { onConflict: "user_id,tender_id" }
    );
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ tender_id: "tender-1", user_id: "user-1" });
  });

  it("GET 목록 조회 시 org_id 와 user_id 로 격리한다", async () => {
    const orderMock = vi.fn().mockResolvedValue({ data: [], error: null });
    const eqUserMock = vi.fn(() => ({ order: orderMock }));
    const eqOrgMock = vi.fn(() => ({ eq: eqUserMock }));

    getAuthContextMock.mockResolvedValue({
      supabase: {
        from: vi.fn(() => ({
          select: vi.fn(() => ({ eq: eqOrgMock })),
        })),
      },
      user: { id: "user-1" },
      orgId: "org-1",
      plan: "free",
    });

    const response = await favoritesGet({} as never);

    expect(eqOrgMock).toHaveBeenCalledWith("org_id", "org-1");
    expect(eqUserMock).toHaveBeenCalledWith("user_id", "user-1");
    expect(response.status).toBe(200);
  });
});

describe("company profile route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET 조회 시 org_id 와 user_id 로 격리한다", async () => {
    const singleMock = vi.fn().mockResolvedValue({
      data: { user_id: "user-1", org_id: "org-1", company_name: "Acme" },
      error: null,
    });
    const eqUserMock = vi.fn(() => ({ single: singleMock }));
    const eqOrgMock = vi.fn(() => ({ eq: eqUserMock }));

    getAuthContextMock.mockResolvedValue({
      user: { id: "user-1" },
      orgId: "org-1",
    });

    createServiceClientMock.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({ eq: eqOrgMock })),
      })),
    });

    const response = await companyProfileGet();

    expect(eqOrgMock).toHaveBeenCalledWith("org_id", "org-1");
    expect(eqUserMock).toHaveBeenCalledWith("user_id", "user-1");
    expect(response.status).toBe(200);
  });
});

describe("tenders route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("필터, 정렬, 페이지네이션을 쿼리에 반영한다", async () => {
    const countQuery = createThenableQuery({ count: 2, error: null });
    const dataQuery = createThenableQuery({
      data: [{ id: "tender-1", title: "AI 플랫폼 구축" }],
      error: null,
    });
    const selectMock = vi
      .fn()
      .mockImplementationOnce(() => countQuery)
      .mockImplementationOnce(() => dataQuery);

    getAuthContextMock.mockResolvedValue({
      supabase: {
        from: vi.fn(() => ({
          select: selectMock,
        })),
      },
    });

    const response = await tendersGet(
      makeUrlRequest(
        "https://example.com/api/tenders?q=AI&status=OPEN&regionCode=11&industryCode=SW&budgetMin=1000000&budgetMax=5000000&agencyId=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa&sortBy=published_at&sortOrder=asc&page=2&pageSize=10"
      ) as never
    );

    expect(countQuery.or).toHaveBeenCalledWith("title.ilike.%AI%,demand_agency_name.ilike.%AI%");
    expect(countQuery.eq).toHaveBeenNthCalledWith(1, "status", "OPEN");
    expect(countQuery.eq).toHaveBeenNthCalledWith(2, "region_code", "11");
    expect(countQuery.eq).toHaveBeenNthCalledWith(3, "industry_code", "SW");
    expect(countQuery.eq).toHaveBeenNthCalledWith(4, "agency_id", "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    expect(countQuery.gte).toHaveBeenCalledWith("budget_amount", 1000000);
    expect(countQuery.lte).toHaveBeenCalledWith("budget_amount", 5000000);
    expect(dataQuery.order).toHaveBeenCalledWith("published_at", { ascending: true });
    expect(dataQuery.range).toHaveBeenCalledWith(10, 19);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      total: 2,
      page: 2,
      pageSize: 10,
      data: [{ id: "tender-1", title: "AI 플랫폼 구축" }],
    });
  });

  it("잘못된 쿼리 파라미터면 400 을 반환한다", async () => {
    getAuthContextMock.mockResolvedValue({
      supabase: {
        from: vi.fn(),
      },
    });

    const response = await tendersGet(
      makeUrlRequest("https://example.com/api/tenders?page=0&pageSize=200") as never
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});

describe("reports summary route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("인증 후 from/to 값을 report_summary RPC 로 전달한다", async () => {
    const rpcMock = vi.fn().mockResolvedValue({
      data: {
        total_tenders: 12,
        total_budget: 340000000,
      },
      error: null,
    });

    getAuthContextMock.mockResolvedValue({
      user: { id: "user-1" },
      orgId: "org-1",
    });
    createServerClientMock.mockResolvedValue({
      rpc: rpcMock,
    });

    const response = await reportsSummaryGet(
      makeUrlRequest("https://example.com/api/reports/summary?from=2026-04-01&to=2026-04-30") as never
    );

    expect(rpcMock).toHaveBeenCalledWith("report_summary", {
      from_date: "2026-04-01",
      to_date: "2026-04-30",
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      total_tenders: 12,
      total_budget: 340000000,
    });
  });
});

describe("saved searches route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET 조회 시 org_id 와 user_id 로 격리한다", async () => {
    const limitMock = vi.fn().mockResolvedValue({ data: [], error: null });
    const orderMock = vi.fn(() => ({ limit: limitMock }));
    const eqUserMock = vi.fn(() => ({ order: orderMock }));
    const eqOrgMock = vi.fn(() => ({ eq: eqUserMock }));

    getAuthContextMock.mockResolvedValue({
      supabase: {
        from: vi.fn(() => ({
          select: vi.fn(() => ({ eq: eqOrgMock })),
        })),
      },
      user: { id: "user-1" },
      orgId: "org-1",
    });

    const response = await savedSearchesGet();

    expect(eqOrgMock).toHaveBeenCalledWith("org_id", "org-1");
    expect(eqUserMock).toHaveBeenCalledWith("user_id", "user-1");
    expect(response.status).toBe(200);
  });

  it("POST 생성 시 org_id 와 user_id 를 저장한다", async () => {
    const singleMock = vi.fn().mockResolvedValue({
      data: { id: "search-1", name: "플랫폼 공고" },
      error: null,
    });
    const selectAfterInsertMock = vi.fn(() => ({ single: singleMock }));
    const insertMock = vi.fn(() => ({ select: selectAfterInsertMock }));
    const countEqUserMock = vi.fn().mockResolvedValue({ count: 1, error: null });
    const countEqOrgMock = vi.fn(() => ({ eq: countEqUserMock }));

    getAuthContextMock.mockResolvedValue({
      supabase: {
        from: vi.fn(() => ({
          select: vi.fn(() => ({ eq: countEqOrgMock })),
          insert: insertMock,
        })),
      },
      user: { id: "user-1" },
      orgId: "org-1",
    });

    const response = await savedSearchesPost(
      makeJsonRequest({
        name: "플랫폼 공고",
        query_json: { q: "플랫폼", sortBy: "published_at", sortOrder: "desc" },
      }) as never
    );

    expect(countEqOrgMock).toHaveBeenCalledWith("org_id", "org-1");
    expect(countEqUserMock).toHaveBeenCalledWith("user_id", "user-1");
    expect(insertMock).toHaveBeenCalledWith({
      org_id: "org-1",
      user_id: "user-1",
      name: "플랫폼 공고",
      query_json: { q: "플랫폼", sortBy: "published_at", sortOrder: "desc" },
    });
    expect(response.status).toBe(201);
  });

  it("PATCH 수정 시 id, org_id, user_id 로 격리하고 조건을 갱신한다", async () => {
    const singleMock = vi.fn().mockResolvedValue({
      data: { id: "search-1", name: "수정된 검색" },
      error: null,
    });
    const selectMock = vi.fn(() => ({ single: singleMock }));
    const eqUserMock = vi.fn(() => ({ select: selectMock }));
    const eqOrgMock = vi.fn(() => ({ eq: eqUserMock }));
    const eqIdMock = vi.fn(() => ({ eq: eqOrgMock }));
    const updateMock = vi.fn(() => ({ eq: eqIdMock }));

    getAuthContextMock.mockResolvedValue({
      supabase: {
        from: vi.fn(() => ({
          update: updateMock,
        })),
      },
      user: { id: "user-1" },
      orgId: "org-1",
    });

    const response = await savedSearchesPatch(
      makeJsonRequest({
        name: "수정된 검색",
        query_json: { status: "OPEN", sortBy: "deadline_at", sortOrder: "asc" },
      }) as never,
      { params: Promise.resolve({ id: "search-1" }) }
    );

    expect(updateMock).toHaveBeenCalledWith({
      name: "수정된 검색",
      query_json: { status: "OPEN", sortBy: "deadline_at", sortOrder: "asc" },
    });
    expect(eqIdMock).toHaveBeenCalledWith("id", "search-1");
    expect(eqOrgMock).toHaveBeenCalledWith("org_id", "org-1");
    expect(eqUserMock).toHaveBeenCalledWith("user_id", "user-1");
    expect(response.status).toBe(200);
  });
});

describe("billing checkout route", () => {
  const originalSecret = process.env.STRIPE_SECRET_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.STRIPE_SECRET_KEY;
    } else {
      process.env.STRIPE_SECRET_KEY = originalSecret;
    }
  });

  it("Stripe 미설정 시 503 반환", async () => {
    delete process.env.STRIPE_SECRET_KEY;

    const response = await checkoutPost(makeJsonRequest({ plan: "pro" }) as never);

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ code: "STRIPE_NOT_CONFIGURED" });
  });

  it("잘못된 플랜이면 400 반환", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test";
    getAuthContextMock.mockResolvedValue({
      user: { id: "user-1", email: "user@example.com" },
      orgId: "org-1",
    });

    const response = await checkoutPost(makeJsonRequest({ plan: "invalid" }) as never);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: "INVALID_PLAN" });
  });

  it("유효한 플랜이면 checkout url 반환", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test";
    process.env.NEXT_PUBLIC_APP_URL = "https://bid-platform.vercel.app";

    const upsertMock = vi.fn().mockResolvedValue({ error: null });
    const eqMock = vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: null }) }));
    createServiceClientMock.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({ eq: eqMock })),
        upsert: upsertMock,
      })),
    });

    getAuthContextMock.mockResolvedValue({
      user: { id: "user-1", email: "user@example.com" },
      orgId: "org-1",
    });

    const customersCreateMock = vi.fn().mockResolvedValue({ id: "cus_123" });
    const sessionsCreateMock = vi.fn().mockResolvedValue({ url: "https://checkout.stripe.test/session" });
    getStripeMock.mockReturnValue({
      customers: { create: customersCreateMock },
      checkout: { sessions: { create: sessionsCreateMock } },
    });

    const response = await checkoutPost(makeJsonRequest({ plan: "pro" }) as never);

    expect(customersCreateMock).toHaveBeenCalled();
    expect(sessionsCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: "cus_123",
        line_items: [{ price: "price_pro", quantity: 1 }],
        success_url: "https://bid-platform.vercel.app/settings/billing?success=true",
      })
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ url: "https://checkout.stripe.test/session" });
  });
});

describe("auth signup route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("입력값이 잘못되면 400 반환", async () => {
    const response = await signupPost(
      makeJsonRequest({ email: "wrong", password: "123" }) as never
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("회원가입 성공 시 201과 userId 반환", async () => {
    const orgMembersSelectMock = vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
    }));
    const orgInsertMock = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({ data: { id: "org-123" }, error: null }),
      })),
    }));
    const orgMembersInsertMock = vi.fn().mockResolvedValue({ error: null });

    createServiceClientMock.mockReturnValue({
      auth: {
        admin: {
          createUser: vi.fn().mockResolvedValue({
            data: { user: { id: "user-123" } },
            error: null,
          }),
        },
      },
      from: vi.fn((table: string) => {
        if (table === "org_members") {
          return {
            select: orgMembersSelectMock,
            insert: orgMembersInsertMock,
          };
        }

        if (table === "orgs") {
          return {
            insert: orgInsertMock,
          };
        }

        throw new Error(`Unexpected table: ${table}`);
      }),
    });

    const response = await signupPost(
      makeJsonRequest({ email: "user@example.com", password: "password123" }) as never
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ message: "회원가입 완료", userId: "user-123", orgId: "org-123" });
  });
});

describe("team invite route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("멤버 권한이면 초대 생성 시 403 반환", async () => {
    getAuthContextMock.mockResolvedValue({
      role: "member",
      orgId: "org-1",
      user: { id: "user-1", email: "member@example.com" },
    });

    const response = await teamInvitePost(
      makeJsonRequest({ email: "invitee@example.com", role: "member" }) as never
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      message: "관리자만 초대할 수 있습니다.",
    });
  });

  it("멤버 권한이면 대기 중 초대 조회 시 403 반환", async () => {
    getAuthContextMock.mockResolvedValue({
      role: "member",
      orgId: "org-1",
      user: { id: "user-1", email: "member@example.com" },
    });

    const response = await teamInvitesGet();

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      message: "관리자만 조회할 수 있습니다.",
    });
  });
});

describe("team accept route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("유효하지 않은 토큰이면 404 반환", async () => {
    getAuthContextMock.mockResolvedValue({
      orgId: "org-1",
      user: { id: "user-1", email: "member@example.com" },
    });

    createServiceClientMock.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: null, error: new Error("not found") }),
          })),
        })),
      })),
    });

    const response = await teamAcceptPost(
      makeJsonRequest({ token: "invalid-token" }) as never
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      message: "유효하지 않은 초대 링크입니다.",
    });
  });

  it("만료된 초대 링크면 410 반환", async () => {
    getAuthContextMock.mockResolvedValue({
      orgId: "org-1",
      user: { id: "user-1", email: "member@example.com" },
    });

    createServiceClientMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "org_invitations") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: "invite-1",
                    org_id: "org-1",
                    email: "member@example.com",
                    role: "member",
                    expires_at: "2020-01-01T00:00:00.000Z",
                  },
                  error: null,
                }),
              })),
            })),
          };
        }

        throw new Error(`Unexpected table: ${table}`);
      }),
    });

    const response = await teamAcceptPost(
      makeJsonRequest({ token: "expired-token" }) as never
    );

    expect(response.status).toBe(410);
    await expect(response.json()).resolves.toMatchObject({
      message: "만료된 초대 링크입니다.",
    });
  });

  it("다른 이메일로 발송된 초대면 403 반환", async () => {
    getAuthContextMock.mockResolvedValue({
      orgId: "org-1",
      user: { id: "user-1", email: "member@example.com" },
    });

    createServiceClientMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "org_invitations") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: "invite-1",
                    org_id: "org-1",
                    email: "other@example.com",
                    role: "member",
                    expires_at: "2099-01-01T00:00:00.000Z",
                  },
                  error: null,
                }),
              })),
            })),
          };
        }

        throw new Error(`Unexpected table: ${table}`);
      }),
    });

    const response = await teamAcceptPost(
      makeJsonRequest({ token: "wrong-email-token" }) as never
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      message: "이 초대는 다른 이메일 주소로 발송되었습니다.",
    });
  });
});