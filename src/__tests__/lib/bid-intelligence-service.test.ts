import { beforeEach, describe, expect, it, vi } from "vitest";

const { createServiceClientMock } = vi.hoisted(() => ({
  createServiceClientMock: vi.fn(),
}));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: createServiceClientMock,
}));

import { getIngestionStatus } from "@/lib/bid-intelligence-service";

function mockCollectionLogsQuery(result: { data: unknown; error: unknown }) {
  const limit = vi.fn().mockResolvedValue(result);
  const order = vi.fn(() => ({ limit }));
  const select = vi.fn(() => ({ order }));
  const from = vi.fn(() => ({ select }));

  createServiceClientMock.mockReturnValue({ from });
}

describe("getIngestionStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-05T06:00:00.000Z"));
  });

  it("collection_logs 기준으로 현재 상태를 정규화한다", async () => {
    mockCollectionLogsQuery({
      data: [
        {
          job_type: "tenders",
          status: "running",
          started_at: "2026-05-05T05:55:00.000Z",
          finished_at: null,
          created_at: "2026-05-05T05:55:00.000Z",
          records_collected: 0,
          error_message: null,
        },
        {
          job_type: "tenders",
          status: "success",
          started_at: "2026-05-05T00:00:00.000Z",
          finished_at: "2026-05-05T00:08:00.000Z",
          created_at: "2026-05-05T00:00:00.000Z",
          records_collected: 120,
          error_message: null,
        },
        {
          job_type: "awards",
          status: "completed",
          started_at: "2026-05-05T00:10:00.000Z",
          finished_at: null,
          created_at: "2026-05-05T00:10:00.000Z",
          records_collected: 18,
          error_message: null,
        },
        {
          job_type: "awards",
          status: "failed",
          started_at: "2026-05-05T03:00:00.000Z",
          finished_at: "2026-05-05T03:01:00.000Z",
          created_at: "2026-05-05T03:00:00.000Z",
          records_collected: 0,
          error_message: "NARA API timeout",
        },
        {
          job_type: "analysis_rebuild",
          status: "completed",
          started_at: "2026-05-05T02:00:00.000Z",
          finished_at: "2026-05-05T02:03:00.000Z",
          created_at: "2026-05-05T02:00:00.000Z",
          records_collected: 0,
          error_message: null,
        },
        {
          job_type: "alerts",
          status: "success",
          started_at: "2026-05-05T02:10:00.000Z",
          finished_at: "2026-05-05T02:11:00.000Z",
          created_at: "2026-05-05T02:10:00.000Z",
          records_collected: 4,
          error_message: null,
        },
        {
          job_type: "participants",
          status: "success",
          started_at: "2026-05-05T02:20:00.000Z",
          finished_at: "2026-05-05T02:21:00.000Z",
          created_at: "2026-05-05T02:20:00.000Z",
          records_collected: 7,
          error_message: null,
        },
        {
          job_type: "cleanup",
          status: "success",
          started_at: "2026-05-04T01:00:00.000Z",
          finished_at: "2026-05-04T01:01:00.000Z",
          created_at: "2026-05-04T01:00:00.000Z",
          records_collected: 9,
          error_message: null,
        },
      ],
      error: null,
    });

    const status = await getIngestionStatus();

    expect(status.tenders.last_started_at).toBe("2026-05-05T05:55:00.000Z");
    expect(status.tenders.last_success_at).toBe("2026-05-05T00:08:00.000Z");
    expect(status.tenders.recent_count).toBe(120);
    expect(status.tenders.is_running).toBe(true);

    expect(status.awards.last_success_at).toBe("2026-05-05T00:10:00.000Z");
    expect(status.awards.last_failure_at).toBe("2026-05-05T03:01:00.000Z");
    expect(status.awards.failure_count_24h).toBe(1);
    expect(status.awards.last_error).toBe("NARA API timeout");

    expect(status.analysis.last_success_at).toBe("2026-05-05T02:03:00.000Z");
    expect(status.analysis_last_rebuilt).toBe("2026-05-05T02:03:00.000Z");
    expect(status.alerts.last_success_at).toBe("2026-05-05T02:11:00.000Z");
    expect(status.alerts.recent_count).toBe(4);
    expect(status.participants.last_success_at).toBe("2026-05-05T02:21:00.000Z");
    expect(status.participants.recent_count).toBe(7);
    expect(status.cleanup.last_success_at).toBe("2026-05-04T01:01:00.000Z");
    expect(status.running_jobs).toEqual(["tenders"]);
    expect(status.recent_failures).toEqual([
      {
        job_type: "awards",
        at: "2026-05-05T03:01:00.000Z",
        message: "NARA API timeout",
      },
    ]);
    expect(status.system_ok).toBe(false);
  });

  it("조회 실패 시 안전한 기본값을 반환한다", async () => {
    mockCollectionLogsQuery({
      data: null,
      error: new Error("query failed"),
    });

    const status = await getIngestionStatus();

    expect(status.system_ok).toBe(false);
    expect(status.tenders.last_success_at).toBeNull();
    expect(status.awards.failure_count_24h).toBe(0);
    expect(status.analysis.last_success_at).toBeNull();
    expect(status.alerts.last_success_at).toBeNull();
    expect(status.participants.last_success_at).toBeNull();
    expect(status.cleanup.last_success_at).toBeNull();
    expect(status.running_jobs).toEqual([]);
    expect(status.recent_failures).toEqual([]);
  });
});