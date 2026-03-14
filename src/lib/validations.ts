import { z } from "zod";

// ─── Tenders 검색 쿼리 ─────────────────────────────────
export const tenderSearchSchema = z.object({
  q: z.string().optional(),
  status: z.enum(["OPEN", "CLOSED", "RESULT"]).optional(),
  regionCode: z.string().optional(),
  industryCode: z.string().optional(),
  budgetMin: z.coerce.number().optional(),
  budgetMax: z.coerce.number().optional(),
  agencyId: z.string().uuid().optional(),
  sortBy: z
    .enum(["published_at", "deadline_at", "budget_amount", "created_at"])
    .optional()
    .default("published_at"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});
export type TenderSearchParams = z.infer<typeof tenderSearchSchema>;

// ─── Alert Rule ────────────────────────────────────────
export const alertRuleCreateSchema = z.object({
  type: z.enum(["KEYWORD", "FILTER"]),
  name: z.string().optional(),
  rule_json: z.object({
    keyword: z.string().optional(),
    regionCodes: z.array(z.string()).optional(),
    budgetMin: z.number().optional(),
    budgetMax: z.number().optional(),
    industryCodes: z.array(z.string()).optional(),
  }),
  channel: z.enum(["EMAIL", "KAKAO"]).default("EMAIL"),
  is_enabled: z.boolean().default(true),
});
export type AlertRuleCreateInput = z.infer<typeof alertRuleCreateSchema>;

export const alertRuleUpdateSchema = z.object({
  type: z.enum(["KEYWORD", "FILTER"]).optional(),
  name: z.string().optional(),
  rule_json: z
    .object({
      keyword: z.string().optional(),
      regionCodes: z.array(z.string()).optional(),
      budgetMin: z.number().optional(),
      budgetMax: z.number().optional(),
      industryCodes: z.array(z.string()).optional(),
    })
    .optional(),
  channel: z.enum(["EMAIL", "KAKAO"]).optional(),
  is_enabled: z.boolean().optional(),
});
export type AlertRuleUpdateInput = z.infer<typeof alertRuleUpdateSchema>;

// ─── Report ────────────────────────────────────────────
export const reportQuerySchema = z.object({
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
});

// ─── Auth ──────────────────────────────────────────────
export const signUpSchema = z.object({
  email: z.string().email("올바른 이메일을 입력하세요"),
  password: z.string().min(6, "비밀번호는 6자 이상이어야 합니다"),
  orgName: z.string().min(1, "조직명을 입력하세요").optional(),
});
export type SignUpInput = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  email: z.string().email("올바른 이메일을 입력하세요"),
  password: z.string().min(1, "비밀번호를 입력하세요"),
});
export type SignInInput = z.infer<typeof signInSchema>;
