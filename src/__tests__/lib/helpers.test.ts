import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  formatKRW,
  tenderStatusLabel,
  getDday,
  isNew,
  formatBudgetCompact,
  formatRawDate,
  retryWithBackoff,
} from "@/lib/helpers";

// helpers.ts가 next/server의 NextRequest를 import하므로 모듈 단위로 mock
vi.mock("next/server", () => ({
  NextRequest: class {
    headers = new Map();
  },
}));

// ─── formatKRW ──────────────────────────────────────────
describe("formatKRW", () => {
  it("null → '-'", () => {
    expect(formatKRW(null)).toBe("-");
  });

  it("undefined → '-'", () => {
    expect(formatKRW(undefined)).toBe("-");
  });

  it("양수 금액 → 원화 포맷", () => {
    const result = formatKRW(1000000);
    expect(result).toContain("1,000,000");
  });

  it("0원 → 0 포함", () => {
    const result = formatKRW(0);
    expect(result).toContain("0");
  });
});

// ─── formatBudgetCompact ────────────────────────────────
describe("formatBudgetCompact", () => {
  it("null → '-'", () => {
    expect(formatBudgetCompact(null)).toBe("-");
  });

  it("1조 이상 → '조' 단위", () => {
    expect(formatBudgetCompact(1_000_000_000_000)).toBe("1.0조");
  });

  it("1억 → '1억'", () => {
    expect(formatBudgetCompact(100_000_000)).toBe("1억");
  });

  it("5천만 → '5천만'", () => {
    expect(formatBudgetCompact(50_000_000)).toBe("5천만");
  });

  it("1만 → '1만'", () => {
    expect(formatBudgetCompact(10_000)).toBe("1만");
  });

  it("9999원 → '9,999원'", () => {
    expect(formatBudgetCompact(9999)).toBe("9,999원");
  });
});

// ─── tenderStatusLabel ──────────────────────────────────
describe("tenderStatusLabel", () => {
  it("OPEN → '진행중'", () => {
    expect(tenderStatusLabel("OPEN")).toBe("진행중");
  });

  it("CLOSED → '마감'", () => {
    expect(tenderStatusLabel("CLOSED")).toBe("마감");
  });

  it("RESULT → '결과발표'", () => {
    expect(tenderStatusLabel("RESULT")).toBe("결과발표");
  });

  it("알 수 없는 값 → 그대로 반환 (fallback)", () => {
    expect(tenderStatusLabel("UNKNOWN")).toBe("UNKNOWN");
  });
});

// ─── getDday ────────────────────────────────────────────
describe("getDday", () => {
  beforeEach(() => {
    // 기준일: 2026-04-02 00:00:00 UTC (고정)
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-02T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("null → null", () => {
    expect(getDday(null)).toBeNull();
  });

  it("과거 날짜 → null", () => {
    expect(getDday("2026-03-01T00:00:00.000Z")).toBeNull();
  });

  it("오늘 마감 → D-DAY, urgent=true", () => {
    // 현재 시각과 동일한 시점: Math.ceil(0/86400000) = 0 → D-DAY
    const result = getDday("2026-04-02T00:00:00.000Z");
    expect(result).not.toBeNull();
    expect(result!.label).toBe("D-DAY");
    expect(result!.urgent).toBe(true);
  });

  it("3일 후 → D-3, urgent=true", () => {
    const result = getDday("2026-04-05T00:00:00.000Z");
    expect(result).not.toBeNull();
    expect(result!.label).toBe("D-3");
    expect(result!.urgent).toBe(true);
  });

  it("7일 후 → D-7, urgent=false, cls=dday-warning", () => {
    const result = getDday("2026-04-09T00:00:00.000Z");
    expect(result).not.toBeNull();
    expect(result!.urgent).toBe(false);
    expect(result!.cls).toBe("dday-warning");
  });

  it("30일 후 → D-30, cls=dday-safe", () => {
    const result = getDday("2026-05-02T00:00:00.000Z");
    expect(result).not.toBeNull();
    expect(result!.cls).toBe("dday-safe");
  });
});

// ─── isNew ──────────────────────────────────────────────
describe("isNew", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-02T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("null → false", () => {
    expect(isNew(null)).toBe(false);
  });

  it("1시간 전 → true (48시간 이내)", () => {
    expect(isNew("2026-04-02T11:00:00.000Z")).toBe(true);
  });

  it("47시간 전 → true (경계값)", () => {
    expect(isNew("2026-04-01T13:00:00.000Z")).toBe(true);
  });

  it("49시간 전 → false", () => {
    expect(isNew("2026-03-31T11:00:00.000Z")).toBe(false);
  });
});

// ─── formatRawDate ──────────────────────────────────────
describe("formatRawDate", () => {
  it("rawJson의 bidNtceDt 필드 파싱", () => {
    const result = formatRawDate(
      { bidNtceDt: "2026-03-15 09:30:00" },
      "bidNtceDt",
      null
    );
    expect(result).toBe("2026. 3. 15.");
  });

  it("includeTime=true → 시간 포함", () => {
    const result = formatRawDate(
      { bidNtceDt: "2026-03-15 09:30:00" },
      "bidNtceDt",
      null,
      true
    );
    expect(result).toBe("2026. 3. 15. 09:30");
  });

  it("rawJson 없고 fallback ISO → 파싱", () => {
    const result = formatRawDate(null, "bidNtceDt", "2026-01-05T00:00:00.000Z");
    expect(result).toBe("2026. 1. 5.");
  });

  it("rawJson도 fallback도 null → '-'", () => {
    expect(formatRawDate(null, "bidNtceDt", null)).toBe("-");
  });
});

// ─── retryWithBackoff ───────────────────────────────────
describe("retryWithBackoff", () => {
  it("첫 번째 시도 성공 → 값 반환", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await retryWithBackoff(fn, 3, 0);
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("처음 2번 실패 후 성공 → 3번째 시도에 성공", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("fail"))
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValue("success");

    const result = await retryWithBackoff(fn, 3, 0);
    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("모든 시도 실패 → 마지막 에러 throw", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("always fail"));
    await expect(retryWithBackoff(fn, 3, 0)).rejects.toThrow("always fail");
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
