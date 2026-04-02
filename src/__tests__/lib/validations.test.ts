import { describe, it, expect } from "vitest";
import {
  signUpSchema,
  signInSchema,
  alertRuleCreateSchema,
  tenderSearchSchema,
} from "@/lib/validations";

// ─── signUpSchema ───────────────────────────────────────
describe("signUpSchema", () => {
  it("올바른 이메일+비밀번호면 성공", () => {
    const result = signUpSchema.safeParse({
      email: "user@example.com",
      password: "password123",
    });
    expect(result.success).toBe(true);
  });

  it("이메일 형식 오류 → 실패", () => {
    const result = signUpSchema.safeParse({
      email: "not-an-email",
      password: "password123",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain("이메일");
  });

  it("비밀번호 5자 → 실패 (6자 이상 필요)", () => {
    const result = signUpSchema.safeParse({
      email: "user@example.com",
      password: "12345",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain("6자");
  });

  it("비밀번호 6자 → 성공 (경계값)", () => {
    const result = signUpSchema.safeParse({
      email: "user@example.com",
      password: "123456",
    });
    expect(result.success).toBe(true);
  });

  it("orgName 없이도 성공 (optional)", () => {
    const result = signUpSchema.safeParse({
      email: "user@example.com",
      password: "password123",
    });
    expect(result.success).toBe(true);
  });
});

// ─── signInSchema ───────────────────────────────────────
describe("signInSchema", () => {
  it("올바른 입력 → 성공", () => {
    const result = signInSchema.safeParse({
      email: "user@example.com",
      password: "any",
    });
    expect(result.success).toBe(true);
  });

  it("비밀번호 빈 문자열 → 실패", () => {
    const result = signInSchema.safeParse({
      email: "user@example.com",
      password: "",
    });
    expect(result.success).toBe(false);
  });
});

// ─── alertRuleCreateSchema ──────────────────────────────
describe("alertRuleCreateSchema", () => {
  it("KEYWORD 타입 최소 입력 → 성공", () => {
    const result = alertRuleCreateSchema.safeParse({
      type: "KEYWORD",
      rule_json: { keyword: "도로" },
    });
    expect(result.success).toBe(true);
    // 기본값 확인
    expect(result.data?.channel).toBe("EMAIL");
    expect(result.data?.is_enabled).toBe(true);
  });

  it("잘못된 type → 실패", () => {
    const result = alertRuleCreateSchema.safeParse({
      type: "INVALID",
      rule_json: {},
    });
    expect(result.success).toBe(false);
  });

  it("FILTER 타입 + 예산 범위 → 성공", () => {
    const result = alertRuleCreateSchema.safeParse({
      type: "FILTER",
      rule_json: { budgetMin: 1000000, budgetMax: 5000000 },
    });
    expect(result.success).toBe(true);
  });
});

// ─── tenderSearchSchema ─────────────────────────────────
describe("tenderSearchSchema", () => {
  it("빈 객체 → 기본값 적용 성공", () => {
    const result = tenderSearchSchema.safeParse({});
    expect(result.success).toBe(true);
    expect(result.data?.page).toBe(1);
    expect(result.data?.pageSize).toBe(20);
    expect(result.data?.sortBy).toBe("published_at");
    expect(result.data?.sortOrder).toBe("desc");
  });

  it("pageSize 101 → 실패 (max 100)", () => {
    const result = tenderSearchSchema.safeParse({ pageSize: 101 });
    expect(result.success).toBe(false);
  });

  it("page 0 → 실패 (min 1)", () => {
    const result = tenderSearchSchema.safeParse({ page: 0 });
    expect(result.success).toBe(false);
  });

  it("status OPEN → 성공", () => {
    const result = tenderSearchSchema.safeParse({ status: "OPEN" });
    expect(result.success).toBe(true);
  });

  it("status INVALID → 실패", () => {
    const result = tenderSearchSchema.safeParse({ status: "PENDING" });
    expect(result.success).toBe(false);
  });

  it("숫자 문자열 page → coerce로 변환 성공", () => {
    const result = tenderSearchSchema.safeParse({ page: "3" });
    expect(result.success).toBe(true);
    expect(result.data?.page).toBe(3);
  });
});
