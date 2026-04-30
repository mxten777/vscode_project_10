import { beforeEach, describe, expect, it, vi } from "vitest";

const { createServiceClientMock } = vi.hoisted(() => ({
  createServiceClientMock: vi.fn(),
}));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: createServiceClientMock,
}));

vi.mock("@/lib/notifications", () => ({
  getNotificationProvider: vi.fn(),
}));

import { POST as processAlertsPost } from "@/app/api/jobs/process-alerts/route";
import { GET as collectParticipantsGet } from "@/app/api/jobs/collect-participants/route";
import { GET as cleanupGet } from "@/app/api/jobs/cleanup/route";
import { getNotificationProvider } from "@/lib/notifications";

function makeRequest(authHeader?: string) {
  return {
    headers: new Headers(authHeader ? { Authorization: authHeader } : {}),
    nextUrl: new URL("https://bid-platform.vercel.app/api/jobs/process-alerts"),
  } as Request & {
    headers: Headers;
    nextUrl: URL;
  };
}

describe("process-alerts route", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = "test-secret";
    vi.clearAllMocks();
  });

  it("신규 공고가 없으면 alerts job 로그를 성공으로 남기고 종료한다", async () => {
    const logInsertSingleMock = vi.fn().mockResolvedValue({ data: { id: "log-1" } });
    const logInsertSelectMock = vi.fn(() => ({ single: logInsertSingleMock }));
    const logInsertMock = vi.fn(() => ({ select: logInsertSelectMock }));
    const logUpdateEqMock = vi.fn().mockResolvedValue({ error: null });
    const logUpdateMock = vi.fn(() => ({ eq: logUpdateEqMock }));

    const alertRulesEqMock = vi.fn().mockResolvedValue({ data: [], error: null });
    const alertRulesSelectMock = vi.fn(() => ({ eq: alertRulesEqMock }));

    const tendersGteMock = vi.fn().mockResolvedValue({ data: [] });
    const tendersSelectMock = vi.fn(() => ({ gte: tendersGteMock }));

    createServiceClientMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "collection_logs") {
          return {
            insert: logInsertMock,
            update: logUpdateMock,
          };
        }

        if (table === "alert_rules") {
          return {
            select: alertRulesSelectMock,
          };
        }

        if (table === "tenders") {
          return {
            select: tendersSelectMock,
          };
        }

        throw new Error(`Unexpected table: ${table}`);
      }),
    });

    const response = await processAlertsPost(makeRequest("Bearer test-secret"));
    const body = await response.json();

    expect(logInsertMock).toHaveBeenCalledWith({ job_type: "alerts", status: "running" });
    expect(logUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "success",
        records_collected: 0,
        finished_at: expect.any(String),
      })
    );
    expect(logUpdateEqMock).toHaveBeenCalledWith("id", "log-1");
    expect(response.status).toBe(200);
    expect(body.message).toContain("신규 공고 없음");
  });

  it("status 와 keyword 가 함께 있는 FILTER 규칙만 신규 공고에 매칭해 발송한다", async () => {
    const providerSendMock = vi.fn().mockResolvedValue({ success: true });
    vi.mocked(getNotificationProvider).mockReturnValue({ send: providerSendMock });

    const logInsertSingleMock = vi.fn().mockResolvedValue({ data: { id: "log-4" } });
    const logInsertSelectMock = vi.fn(() => ({ single: logInsertSingleMock }));
    const logInsertMock = vi.fn(() => ({ select: logInsertSelectMock }));
    const logUpdateEqMock = vi.fn().mockResolvedValue({ error: null });
    const logUpdateMock = vi.fn(() => ({ eq: logUpdateEqMock }));

    const alertRulesEqMock = vi.fn().mockResolvedValue({
      data: [{
        id: "rule-1",
        user_id: "user-1",
        channel: "EMAIL",
        type: "FILTER",
        rule_json: { keyword: "플랫폼", statuses: ["OPEN"] },
      }],
      error: null,
    });
    const alertRulesSelectMock = vi.fn(() => ({ eq: alertRulesEqMock }));

    const tendersGteMock = vi.fn().mockResolvedValue({
      data: [
        {
          id: "tender-1",
          title: "플랫폼 운영 용역",
          status: "OPEN",
          budget_amount: 1000000,
          deadline_at: "2026-04-30T12:00:00.000Z",
          demand_agency_name: "테스트 기관",
          region_name: "서울",
        },
        {
          id: "tender-2",
          title: "플랫폼 운영 용역",
          status: "CLOSED",
          budget_amount: 1000000,
          deadline_at: "2026-04-30T12:00:00.000Z",
          demand_agency_name: "테스트 기관",
          region_name: "서울",
        },
      ],
    });
    const tendersSelectMock = vi.fn(() => ({ gte: tendersGteMock }));

    const alertLogsSingleMock = vi.fn().mockResolvedValue({ data: { id: "alert-log-1" }, error: null });
    const alertLogsSelectMock = vi.fn(() => ({ single: alertLogsSingleMock }));
    const alertLogsInsertMock = vi.fn(() => ({ select: alertLogsSelectMock }));

    createServiceClientMock.mockReturnValue({
      auth: {
        admin: {
          getUserById: vi.fn().mockResolvedValue({ data: { user: { email: "user@example.com" } } }),
        },
      },
      from: vi.fn((table: string) => {
        if (table === "collection_logs") {
          return {
            insert: logInsertMock,
            update: logUpdateMock,
          };
        }

        if (table === "alert_rules") {
          return {
            select: alertRulesSelectMock,
          };
        }

        if (table === "tenders") {
          return {
            select: tendersSelectMock,
          };
        }

        if (table === "alert_logs") {
          return {
            insert: alertLogsInsertMock,
            update: vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })) })),
          };
        }

        throw new Error(`Unexpected table: ${table}`);
      }),
    });

    const response = await processAlertsPost(makeRequest("Bearer test-secret"));
    const body = await response.json();

    expect(providerSendMock).toHaveBeenCalledTimes(1);
    expect(alertLogsInsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        alert_rule_id: "rule-1",
        tender_id: "tender-1",
        status: "SENT",
      })
    );
    expect(response.status).toBe(200);
    expect(body.sent).toBe(1);
  });

  it("participants 대상이 없으면 participants job 로그를 성공으로 남기고 종료한다", async () => {
    const logInsertSingleMock = vi.fn().mockResolvedValue({ data: { id: "log-2" } });
    const logInsertSelectMock = vi.fn(() => ({ single: logInsertSingleMock }));
    const logInsertMock = vi.fn(() => ({ select: logInsertSelectMock }));
    const logUpdateEqMock = vi.fn().mockResolvedValue({ error: null });
    const logUpdateMock = vi.fn(() => ({ eq: logUpdateEqMock }));

    const tendersLimitMock = vi.fn().mockResolvedValue({ data: [], error: null });
    const tendersOrderBudgetMock = vi.fn(() => ({ limit: tendersLimitMock }));
    const tendersOrderStatusMock = vi.fn(() => ({ order: tendersOrderBudgetMock }));
    const tendersOrMock = vi.fn(() => ({ order: tendersOrderStatusMock }));
    const tendersEqMock = vi.fn(() => ({ or: tendersOrMock }));
    const tendersSelectMock = vi.fn(() => ({ eq: tendersEqMock }));

    createServiceClientMock.mockReturnValue({
      rpc: vi.fn().mockResolvedValue({ data: { upserted: 1 }, error: null }),
      from: vi.fn((table: string) => {
        if (table === "collection_logs") {
          return {
            insert: logInsertMock,
            update: logUpdateMock,
          };
        }

        if (table === "tenders") {
          return {
            select: tendersSelectMock,
          };
        }

        throw new Error(`Unexpected table: ${table}`);
      }),
    });

    const response = await collectParticipantsGet(makeRequest("Bearer test-secret"));
    const body = await response.json();

    expect(logInsertMock).toHaveBeenCalledWith({ job_type: "participants", status: "running" });
    expect(logUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "success",
        records_collected: 0,
        finished_at: expect.any(String),
      })
    );
    expect(body.message).toContain("수집 대상 없음");
  });

  it("cleanup 성공 시 cleanup job 로그를 성공으로 남긴다", async () => {
    const logInsertSingleMock = vi.fn().mockResolvedValue({ data: { id: "log-3" } });
    const logInsertSelectMock = vi.fn(() => ({ single: logInsertSingleMock }));
    const logInsertMock = vi.fn(() => ({ select: logInsertSelectMock }));
    const logUpdateEqMock = vi.fn().mockResolvedValue({ error: null });
    const logUpdateMock = vi.fn(() => ({ eq: logUpdateEqMock }));

    createServiceClientMock.mockReturnValue({
      rpc: vi.fn().mockResolvedValue({
        data: {
          alert_logs_deleted: 2,
          collection_logs_deleted: 3,
          tenders_closed: 4,
          ran_at: "2026-05-05T00:00:00.000Z",
        },
        error: null,
      }),
      from: vi.fn((table: string) => {
        if (table === "collection_logs") {
          return {
            insert: logInsertMock,
            update: logUpdateMock,
          };
        }

        throw new Error(`Unexpected table: ${table}`);
      }),
    });

    const response = await cleanupGet(makeRequest("Bearer test-secret"));
    const body = await response.json();

    expect(logInsertMock).toHaveBeenCalledWith({ job_type: "cleanup", status: "running" });
    expect(logUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "success",
        records_collected: 9,
        finished_at: expect.any(String),
      })
    );
    expect(response.status).toBe(200);
    expect(body.message).toContain("cleanup 완료");
  });
});