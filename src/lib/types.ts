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

// ─── Bid Intelligence 타입 ─────────────────────────────

export interface BidNotice {
  id: string;
  tender_id: string | null;
  source_bid_notice_id: string;
  notice_number: string;
  notice_name: string;
  demand_organization: string | null;
  contract_type: string | null;
  bid_type: string | null;
  base_amount: number | null;
  estimated_price: number | null;
  lower_limit_rate: number | null;
  bid_start_datetime: string | null;
  bid_end_datetime: string | null;
  open_datetime: string | null;
  industry_code: string | null;
  industry_name: string | null;
  region_code: string | null;
  region_name: string | null;
  raw_json: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface BidOpenResult {
  id: string;
  bid_notice_id: string;
  opened_at: string;
  total_bidders: number;
  valid_bidders: number;
  highest_bid_rate: number | null;
  lowest_bid_rate: number | null;
  average_bid_rate: number | null;
  median_bid_rate: number | null;
  expected_winner_company: string | null;
  expected_winner_bid_rate: number | null;
  expected_winner_amount: number | null;
  is_successful: boolean;
  failure_reason: string | null;
  raw_json: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface BidAward {
  id: string;
  bid_notice_id: string;
  winner_company_name: string;
  winner_business_number: string | null;
  winner_bid_rate: number;
  winner_bid_amount: number;
  contract_amount: number | null;
  contract_date: string | null;
  contract_type: string | null;
  performance_guarantee_rate: number | null;
  advance_payment_rate: number | null;
  is_final: boolean;
  awarded_at: string | null;
  raw_json: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export type BidConfidence = "HIGH" | "MEDIUM" | "LOW" | "VERY_LOW";

export interface BidStrategy {
  rate: number;
  amount: number;
  confidence: BidConfidence;
  description: string;
}

export interface BidRecommendation {
  id: string;
  tender_id: string;
  conservative_rate: number;
  conservative_amount: number;
  conservative_confidence: BidConfidence;
  standard_rate: number;
  standard_amount: number;
  standard_confidence: BidConfidence;
  aggressive_rate: number;
  aggressive_amount: number;
  aggressive_confidence: BidConfidence;
  similar_bids_count: number;
  analysis_period_months: number;
  data_quality_score: number;
  warnings: string[];
  explanation: Record<string, unknown>;
  recommended_at: string;
  expires_at: string;
  created_at: string;
  cached?: boolean;
}

export interface SimilarBid {
  bid_notice_id: string;
  similarity_score: number;
  notice_name: string;
  demand_organization: string;
  winner_bid_rate: number;
  winner_bid_amount: number;
  total_bidders: number;
  awarded_at: string;
}

export interface BidAnalytics {
  count: number;
  bid_rate: {
    min: number;
    max: number;
    mean: number;
    median: number;
    p25: number;
    p75: number;
  };
  bid_amount: {
    min: number;
    max: number;
    mean: number;
    median: number;
    total: number;
  };
}

// ─── AI Insights 타입 ──────────────────────────────────

export interface AIInsightTender {
  id: string;
  source_tender_id: string;
  title: string;
  industry_code: string | null;
  industry_name: string | null;
  region_code: string | null;
  region_name: string | null;
  demand_agency_name: string | null;
  budget_amount: number | null;
  deadline_at: string | null;
  ind_rate: number;   // 업종 낙찰률 (%)
  agn_rate: number;   // 기관 낙찰률 (%)
  rgn_rate: number;   // 지역 낙찰률 (%)
  avg_bidders: number; // 평균 경쟁업체 수
  win_probability: number; // 낙찰 가능성 점수 (0~100)
}

export interface AIInsights {
  recommended: AIInsightTender[];     // 종합 추천
  high_probability: AIInsightTender[]; // 낙찰 가능성 높음
  low_competition: AIInsightTender[]; // 경쟁 적음
  high_profitability: AIInsightTender[]; // 수익성 높음
  computed_at: string;
  cached: boolean;
}

