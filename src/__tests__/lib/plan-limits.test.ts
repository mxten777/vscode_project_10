import { describe, it, expect, vi } from "vitest";
import { PLAN_LIMITS } from "@/lib/auth-context";

// auth-context.ts는 Supabase 클라이언트를 import하므로 mock 처리
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/api-response", () => ({
  unauthorizedResponse: vi.fn(() => ({ status: 401 })),
}));

// ─── PLAN_LIMITS 상수값 검증 ────────────────────────────
describe("PLAN_LIMITS", () => {
  it("free 플랜: alertRules=3, favorites=50", () => {
    expect(PLAN_LIMITS.free.alertRules).toBe(3);
    expect(PLAN_LIMITS.free.favorites).toBe(50);
  });

  it("pro 플랜: alertRules=50, favorites=Infinity", () => {
    expect(PLAN_LIMITS.pro.alertRules).toBe(50);
    expect(PLAN_LIMITS.pro.favorites).toBe(Infinity);
  });

  it("enterprise 플랜: 모두 Infinity", () => {
    expect(PLAN_LIMITS.enterprise.alertRules).toBe(Infinity);
    expect(PLAN_LIMITS.enterprise.favorites).toBe(Infinity);
  });

  it("free 플랜 알림규칙: 3건 이하는 허용", () => {
    const currentCount = 2;
    const limit = PLAN_LIMITS.free.alertRules;
    expect(currentCount < limit).toBe(true);
  });

  it("free 플랜 알림규칙: 3건이면 초과 (limit 도달)", () => {
    const currentCount = 3;
    const limit = PLAN_LIMITS.free.alertRules;
    expect(currentCount >= limit).toBe(true);
  });

  it("pro 플랜 즐겨찾기: 무제한 (1000건도 허용)", () => {
    const currentCount = 1000;
    const limit = PLAN_LIMITS.pro.favorites;
    expect(currentCount < limit).toBe(true);
  });

  it("플랜 키 목록 확인", () => {
    const keys = Object.keys(PLAN_LIMITS);
    expect(keys).toContain("free");
    expect(keys).toContain("pro");
    expect(keys).toContain("enterprise");
    expect(keys).toHaveLength(3);
  });

  // 실제 API에서 사용하는 플랜 체크 로직과 동일한 패턴
  it("플랜 제한 로직 시뮬레이션 - free 사용자 4번째 규칙 생성 시도 → 거부", () => {
    const plan = "free";
    const currentRuleCount = 3;
    const isBlocked = currentRuleCount >= PLAN_LIMITS[plan].alertRules;
    expect(isBlocked).toBe(true);
  });

  it("플랜 제한 로직 시뮬레이션 - pro 사용자 50번째 규칙 (currentCount=49) → 허용", () => {
    const plan = "pro";
    const currentRuleCount = 49; // 49개 보유 → 50번째 추가 가능 (limit=50)
    const isBlocked = currentRuleCount >= PLAN_LIMITS[plan].alertRules;
    expect(isBlocked).toBe(false);
  });
});
