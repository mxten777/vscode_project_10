import { beforeEach, describe, expect, it, vi } from "vitest";

const { createServiceClientMock } = vi.hoisted(() => ({
  createServiceClientMock: vi.fn(),
}));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: createServiceClientMock,
}));

import { GET as collectBidAwardsGet } from "@/app/api/jobs/collect-bid-awards/route";

function makeRequest(authHeader?: string) {
  return {
    headers: new Headers(authHeader ? { Authorization: authHeader } : {}),
    nextUrl: new URL("https://bid-platform.vercel.app/api/jobs/collect-bid-awards"),
  } as Request & {
    headers: Headers;
    nextUrl: URL;
  };
}

describe("collect-bid-awards route", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = "test-secret";
    delete process.env.NARA_AWARD_API_KEY;
    delete process.env.NARA_API_KEY;
    vi.clearAllMocks();
  });

  it("API 키가 없으면 awards job 로그를 실패로 남긴다", async () => {
    const logInsertSingleMock = vi.fn().mockResolvedValue({ data: { id: "log-awards-1" } });
    const logInsertSelectMock = vi.fn(() => ({ single: logInsertSingleMock }));
    const logInsertMock = vi.fn(() => ({ select: logInsertSelectMock }));
    const logUpdateEqMock = vi.fn().mockResolvedValue({ error: null });
    const logUpdateMock = vi.fn(() => ({ eq: logUpdateEqMock }));

    createServiceClientMock.mockReturnValue({
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

    const response = await collectBidAwardsGet(makeRequest("Bearer test-secret"));
    const body = await response.json();

    expect(logInsertMock).toHaveBeenCalledWith({ job_type: "awards", status: "running" });
    expect(logUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "failed",
        finished_at: expect.any(String),
        error_message: "NARA_API_KEY not configured",
      })
    );
    expect(response.status).toBe(500);
    expect(body).toEqual({
      code: "INTERNAL_ERROR",
      message: "NARA_API_KEY not configured",
      details: undefined,
    });
  });
});