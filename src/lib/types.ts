// ─── 도메인 타입 정의 ───────────────────────────────────

export interface Org {
  id: string;
  name: string;
  plan: "free" | "pro" | "enterprise";
  created_at: string;
}

export interface OrgMember {
  id: string;
  org_id: string;
  user_id: string;
  role: "admin" | "member";
  created_at: string;
}

export interface Agency {
  id: string;
  code: string;
  name: string;
  raw_json: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export type TenderStatus = "OPEN" | "CLOSED" | "RESULT";

export interface Tender {
  id: string;
  source_tender_id: string;
  title: string;
  agency_id: string | null;
  demand_agency_name: string | null;
  budget_amount: number | null;
  region_code: string | null;
  region_name: string | null;
  industry_code: string | null;
  industry_name: string | null;
  method_type: string | null;
  published_at: string | null;
  deadline_at: string | null;
  status: TenderStatus;
  raw_json: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  // joined
  agency?: Agency;
  award?: Award;
  is_favorited?: boolean;
}

export interface Award {
  id: string;
  tender_id: string;
  winner_company_name: string | null;
  awarded_amount: number | null;
  awarded_rate: number | null;
  opened_at: string | null;
  raw_json: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface Favorite {
  id: string;
  org_id: string;
  user_id: string;
  tender_id: string;
  created_at: string;
  tender?: Tender;
}

export type AlertType = "KEYWORD" | "FILTER";
export type AlertChannel = "EMAIL" | "KAKAO";

export interface AlertRuleJson {
  keyword?: string;
  regionCodes?: string[];
  budgetMin?: number;
  budgetMax?: number;
  industryCodes?: string[];
}

export interface AlertRule {
  id: string;
  org_id: string;
  user_id: string;
  type: AlertType;
  name: string | null;
  rule_json: AlertRuleJson;
  channel: AlertChannel;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export type AlertLogStatus = "SENT" | "FAIL";

export interface AlertLog {
  id: string;
  alert_rule_id: string;
  tender_id: string;
  sent_at: string;
  status: AlertLogStatus;
  error_message: string | null;
  tender?: Tender;
}

// ─── API Response 공통 ─────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ReportSummary {
  totalTenders: number;
  totalBudget: number;
  topAgencies: { name: string; count: number }[];
  topIndustries: { name: string; count: number }[];
  statusDistribution: { status: string; count: number }[];
}
