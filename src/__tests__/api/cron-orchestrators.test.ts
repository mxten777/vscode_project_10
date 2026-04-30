import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { POST as cronIngestPost } from "@/app/api/jobs/cron-ingest/route";
import { POST as cronMaintenancePost } from "@/app/api/jobs/cron-maintenance/route";

function makeRequest(path: string, authHeader?: string) {
  return {
    headers: new Headers(authHeader ? { Authorization: authHeader } : {}),
    nextUrl: new URL(`https://bid-platform.vercel.app${path}`),
  } as Request & {
    headers: Headers;
    nextUrl: URL;
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

describe("cron-ingest route", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = "test-secret";
    vi.restoreAllMocks();
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("인증 헤더가 없으면 401 반환", async () => {
    const response = await cronIngestPost(makeRequest("/api/jobs/cron-ingest"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("poll-tenders와 collect-bid-awards를 순차 호출한다", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse({ inserted: 10 }))
      .mockResolvedValueOnce(jsonResponse({ processed: 5 }));

    const response = await cronIngestPost(
      makeRequest("/api/jobs/cron-ingest", "Bearer test-secret")
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0].toString()).toBe(
      "https://bid-platform.vercel.app/api/jobs/poll-tenders?maxPages=3&lookbackDays=2"
    );
    expect(fetchMock.mock.calls[1]?.[0].toString()).toBe(
      "https://bid-platform.vercel.app/api/jobs/collect-bid-awards?lookbackDays=2&maxPages=1&maxItems=25"
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.results).toHaveLength(2);
    expect(body.results[0].name).toBe("poll-tenders");
    expect(body.results[1].name).toBe("collect-bid-awards");
  });

  it("내부 step timeout도 207 결과로 반환한다", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(Object.assign(new Error("The operation was aborted due to timeout"), { name: "TimeoutError" }))
      .mockResolvedValueOnce(jsonResponse({ processed: 5 }));

    const response = await cronIngestPost(
      makeRequest("/api/jobs/cron-ingest", "Bearer test-secret")
    );

    const body = await response.json();
    expect(response.status).toBe(207);
    expect(body.success).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(body.results[0]).toMatchObject({
      name: "poll-tenders",
      status: 504,
      ok: false,
      body: { error: "The operation was aborted due to timeout" },
    });
  });
});

describe("cron-maintenance route", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = "test-secret";
    vi.restoreAllMocks();
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
    vi.useRealTimers();
  });

  it("월요일에는 embed-batch를 포함하고 cleanup은 제외한다", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-04T02:00:00.000Z"));

    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () => jsonResponse({ ok: true }));

    const response = await cronMaintenancePost(
      makeRequest("/api/jobs/cron-maintenance", "Bearer test-secret")
    );

    const calledPaths = fetchMock.mock.calls.map((call) => call[0].toString());
    expect(calledPaths).toEqual([
      "https://bid-platform.vercel.app/api/jobs/process-alerts",
      "https://bid-platform.vercel.app/api/jobs/rebuild-analysis",
      "https://bid-platform.vercel.app/api/jobs/collect-participants",
      "https://bid-platform.vercel.app/api/ai/embed-batch",
    ]);

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.day_of_week_utc).toBe(1);
  });

  it("일요일에는 cleanup을 포함하고 process-alerts는 제외한다", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-03T02:00:00.000Z"));

    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () => jsonResponse({ ok: true }));

    const response = await cronMaintenancePost(
      makeRequest("/api/jobs/cron-maintenance", "Bearer test-secret")
    );

    const calledPaths = fetchMock.mock.calls.map((call) => call[0].toString());
    expect(calledPaths).toEqual([
      "https://bid-platform.vercel.app/api/jobs/rebuild-analysis",
      "https://bid-platform.vercel.app/api/jobs/collect-participants",
      "https://bid-platform.vercel.app/api/jobs/cleanup",
    ]);

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.day_of_week_utc).toBe(0);
  });
});