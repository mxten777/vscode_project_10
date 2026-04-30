import { beforeEach, describe, expect, it, vi } from "vitest";

const { createServiceClientMock } = vi.hoisted(() => ({
  createServiceClientMock: vi.fn(),
}));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: createServiceClientMock,
}));

import { POST as backfillAwardsPost } from "@/app/api/jobs/backfill-awards/route";

function makeRequest(path: string, authHeader?: string) {
  return {
    headers: new Headers(authHeader ? { Authorization: authHeader } : {}),
    nextUrl: new URL(`https://bid-platform.vercel.app${path}`),
  } as Request & {
    headers: Headers;
    nextUrl: URL;
  };
}

describe("backfill-awards route", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = "test-secret";
    delete process.env.NARA_AWARD_API_KEY;
    delete process.env.NARA_API_KEY;
    vi.clearAllMocks();
  });

  it("API 키가 없으면 backfill_awards 로그를 실패로 남긴다", async () => {
    const logInsertSingleMock = vi.fn().mockResolvedValue({ data: { id: "log-backfill-1" } });
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

    const response = await backfillAwardsPost(
      makeRequest("/api/jobs/backfill-awards?months=1", "Bearer test-secret")
    );
    const body = await response.json();

    expect(logInsertMock).toHaveBeenCalledWith({ job_type: "backfill_awards", status: "running" });
    expect(logUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "failed",
        finished_at: expect.any(String),
        error_message: "NARA_AWARD_API_KEY not configured",
      })
    );
    expect(response.status).toBe(500);
    expect(body).toEqual({
      code: "INTERNAL_ERROR",
      message: "NARA_AWARD_API_KEY not configured",
      details: undefined,
    });
  });
});