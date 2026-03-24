/**
 * 데모 데이터 시드 스크립트
 * 실행: node scripts/seed-demo.mjs
 *
 * Supabase에 현실적인 한국 공공입찰 데모 데이터를 삽입합니다.
 * 환경 변수 설정 필요: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * (또는 .env.local 파일)
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// .env.local 파일에서 환경 변수 로드
const __dirname = dirname(fileURLToPath(import.meta.url));
try {
  const envContent = readFileSync(resolve(__dirname, "../.env.local"), "utf8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        const raw = trimmed.slice(eqIdx + 1).trim();
        const value = raw.replace(/^["']|["']$/g, "");
        if (!process.env[key]) process.env[key] = value;
      }
    }
  }
} catch {
  // .env.local 없으면 기존 환경 변수 사용
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("오류: NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 환경 변수가 없습니다.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ─── 발주 기관 ────────────────────────────────────────────
const AGENCIES = [
  { code: "DEMO001", name: "서울특별시청" },
  { code: "DEMO002", name: "국방부" },
  { code: "DEMO003", name: "과학기술정보통신부" },
  { code: "DEMO004", name: "행정안전부" },
  { code: "DEMO005", name: "교육부" },
  { code: "DEMO006", name: "중소벤처기업부" },
  { code: "DEMO007", name: "한국정보화진흥원" },
  { code: "DEMO008", name: "조달청" },
  { code: "DEMO009", name: "경기도청" },
  { code: "DEMO010", name: "부산광역시청" },
  { code: "DEMO011", name: "인천광역시청" },
  { code: "DEMO012", name: "한국전자통신연구원" },
  { code: "DEMO013", name: "국토교통부" },
  { code: "DEMO014", name: "보건복지부" },
  { code: "DEMO015", name: "환경부" },
];

// ─── 날짜 헬퍼 ────────────────────────────────────────────
function daysFromNow(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function daysAgo(days) {
  return daysFromNow(-days);
}

// ─── 공고 원시 데이터 ─────────────────────────────────────
function makeTenders(agencyMap) {
  return [
    // ── 진행중 (OPEN) ────────────────────────────────────
    {
      source_tender_id: "DEMO-2026-001",
      title: "2026년 AI 기반 공공데이터 통합 플랫폼 구축 사업",
      agency_id: agencyMap["DEMO007"],
      demand_agency_name: "한국정보화진흥원",
      budget_amount: 1_200_000_000,
      region_code: "11", region_name: "서울",
      industry_code: "C001", industry_name: "소프트웨어 개발",
      method_type: "일반경쟁",
      published_at: daysAgo(5),
      deadline_at: daysFromNow(1), // D-1 긴급!
      status: "OPEN",
    },
    {
      source_tender_id: "DEMO-2026-002",
      title: "행정정보시스템 고도화 및 클라우드 전환 사업",
      agency_id: agencyMap["DEMO004"],
      demand_agency_name: "행정안전부",
      budget_amount: 3_500_000_000,
      region_code: "11", region_name: "서울",
      industry_code: "C002", industry_name: "정보시스템 구축",
      method_type: "일반경쟁",
      published_at: daysAgo(3),
      deadline_at: daysFromNow(2), // D-2 긴급!
      status: "OPEN",
    },
    {
      source_tender_id: "DEMO-2026-003",
      title: "국방 사이버보안 체계 구축 2단계",
      agency_id: agencyMap["DEMO002"],
      demand_agency_name: "국방부",
      budget_amount: 8_900_000_000,
      region_code: "11", region_name: "서울",
      industry_code: "C003", industry_name: "정보보안",
      method_type: "제한경쟁",
      published_at: daysAgo(7),
      deadline_at: daysFromNow(3), // D-3 긴급!
      status: "OPEN",
    },
    {
      source_tender_id: "DEMO-2026-004",
      title: "서울시 스마트시티 IoT 인프라 확충 사업",
      agency_id: agencyMap["DEMO001"],
      demand_agency_name: "서울특별시청",
      budget_amount: 5_600_000_000,
      region_code: "11", region_name: "서울",
      industry_code: "C004", industry_name: "정보통신공사",
      method_type: "일반경쟁",
      published_at: daysAgo(4),
      deadline_at: daysFromNow(5),
      status: "OPEN",
    },
    {
      source_tender_id: "DEMO-2026-005",
      title: "중소기업 디지털전환 지원 플랫폼 운영 용역",
      agency_id: agencyMap["DEMO006"],
      demand_agency_name: "중소벤처기업부",
      budget_amount: 850_000_000,
      region_code: "11", region_name: "서울",
      industry_code: "C005", industry_name: "용역·서비스",
      method_type: "일반경쟁",
      published_at: daysAgo(2),
      deadline_at: daysFromNow(7),
      status: "OPEN",
    },
    {
      source_tender_id: "DEMO-2026-006",
      title: "2026 교육행정정보시스템(NEIS) 유지보수 사업",
      agency_id: agencyMap["DEMO005"],
      demand_agency_name: "교육부",
      budget_amount: 12_000_000_000,
      region_code: "11", region_name: "서울",
      industry_code: "C001", industry_name: "소프트웨어 개발",
      method_type: "일반경쟁",
      published_at: daysAgo(1),
      deadline_at: daysFromNow(10),
      status: "OPEN",
    },
    {
      source_tender_id: "DEMO-2026-007",
      title: "경기도 공공WiFi 인프라 구축 및 운영",
      agency_id: agencyMap["DEMO009"],
      demand_agency_name: "경기도청",
      budget_amount: 2_300_000_000,
      region_code: "41", region_name: "경기",
      industry_code: "C004", industry_name: "정보통신공사",
      method_type: "일반경쟁",
      published_at: daysAgo(6),
      deadline_at: daysFromNow(12),
      status: "OPEN",
    },
    {
      source_tender_id: "DEMO-2026-008",
      title: "국토부 교통빅데이터 분석·활용 시스템 구축",
      agency_id: agencyMap["DEMO013"],
      demand_agency_name: "국토교통부",
      budget_amount: 4_500_000_000,
      region_code: "11", region_name: "서울",
      industry_code: "C006", industry_name: "빅데이터·AI",
      method_type: "일반경쟁",
      published_at: daysAgo(8),
      deadline_at: daysFromNow(14),
      status: "OPEN",
    },
    {
      source_tender_id: "DEMO-2026-009",
      title: "부산시 스마트항만 관제시스템 소프트웨어 개발",
      agency_id: agencyMap["DEMO010"],
      demand_agency_name: "부산광역시청",
      budget_amount: 1_800_000_000,
      region_code: "26", region_name: "부산",
      industry_code: "C001", industry_name: "소프트웨어 개발",
      method_type: "제한경쟁",
      published_at: daysAgo(3),
      deadline_at: daysFromNow(15),
      status: "OPEN",
    },
    {
      source_tender_id: "DEMO-2026-010",
      title: "보건복지부 사회보장정보원 클라우드 전환 사업",
      agency_id: agencyMap["DEMO014"],
      demand_agency_name: "보건복지부",
      budget_amount: 7_200_000_000,
      region_code: "11", region_name: "서울",
      industry_code: "C007", industry_name: "클라우드 서비스",
      method_type: "일반경쟁",
      published_at: daysAgo(2),
      deadline_at: daysFromNow(18),
      status: "OPEN",
    },
    {
      source_tender_id: "DEMO-2026-011",
      title: "과기부 국가슈퍼컴퓨터 5호기 운영 지원 용역",
      agency_id: agencyMap["DEMO003"],
      demand_agency_name: "과학기술정보통신부",
      budget_amount: 3_100_000_000,
      region_code: "11", region_name: "서울",
      industry_code: "C008", industry_name: "IT 인프라 운영",
      method_type: "일반경쟁",
      published_at: daysAgo(4),
      deadline_at: daysFromNow(20),
      status: "OPEN",
    },
    {
      source_tender_id: "DEMO-2026-012",
      title: "인천시 공공시설물 스마트 유지관리 시스템 구축",
      agency_id: agencyMap["DEMO011"],
      demand_agency_name: "인천광역시청",
      budget_amount: 980_000_000,
      region_code: "28", region_name: "인천",
      industry_code: "C009", industry_name: "시설관리",
      method_type: "일반경쟁",
      published_at: daysAgo(5),
      deadline_at: daysFromNow(22),
      status: "OPEN",
    },
    {
      source_tender_id: "DEMO-2026-013",
      title: "조달청 전자조달시스템(나라장터) 고도화 사업 5차",
      agency_id: agencyMap["DEMO008"],
      demand_agency_name: "조달청",
      budget_amount: 9_800_000_000,
      region_code: "11", region_name: "서울",
      industry_code: "C001", industry_name: "소프트웨어 개발",
      method_type: "일반경쟁",
      published_at: daysAgo(1),
      deadline_at: daysFromNow(25),
      status: "OPEN",
    },
    {
      source_tender_id: "DEMO-2026-014",
      title: "환경부 대기오염 실시간 모니터링 플랫폼 고도화",
      agency_id: agencyMap["DEMO015"],
      demand_agency_name: "환경부",
      budget_amount: 1_450_000_000,
      region_code: "11", region_name: "서울",
      industry_code: "C010", industry_name: "환경·에너지",
      method_type: "일반경쟁",
      published_at: daysAgo(7),
      deadline_at: daysFromNow(28),
      status: "OPEN",
    },
    {
      source_tender_id: "DEMO-2026-015",
      title: "ETRI 양자암호통신 기술 실증 SW 개발 연구용역",
      agency_id: agencyMap["DEMO012"],
      demand_agency_name: "한국전자통신연구원",
      budget_amount: 2_600_000_000,
      region_code: "42", region_name: "대전",
      industry_code: "C003", industry_name: "정보보안",
      method_type: "제한경쟁",
      published_at: daysAgo(3),
      deadline_at: daysFromNow(30),
      status: "OPEN",
    },

    // ── 마감됨 (CLOSED) ───────────────────────────────────
    {
      source_tender_id: "DEMO-2026-016",
      title: "서울시 도봉구 노후공공시설 리모델링 공사",
      agency_id: agencyMap["DEMO001"],
      demand_agency_name: "서울특별시청",
      budget_amount: 4_200_000_000,
      region_code: "11", region_name: "서울",
      industry_code: "D001", industry_name: "건설·공사",
      method_type: "일반경쟁",
      published_at: daysAgo(30),
      deadline_at: daysAgo(5),
      status: "CLOSED",
    },
    {
      source_tender_id: "DEMO-2026-017",
      title: "국방 통합전술네트워크 유지보수 및 장비교체",
      agency_id: agencyMap["DEMO002"],
      demand_agency_name: "국방부",
      budget_amount: 6_700_000_000,
      region_code: "11", region_name: "서울",
      industry_code: "C004", industry_name: "정보통신공사",
      method_type: "제한경쟁",
      published_at: daysAgo(25),
      deadline_at: daysAgo(3),
      status: "CLOSED",
    },
    {
      source_tender_id: "DEMO-2026-018",
      title: "교육부 학교정보보안 강화 컨설팅 및 솔루션 도입",
      agency_id: agencyMap["DEMO005"],
      demand_agency_name: "교육부",
      budget_amount: 730_000_000,
      region_code: "11", region_name: "서울",
      industry_code: "C003", industry_name: "정보보안",
      method_type: "일반경쟁",
      published_at: daysAgo(20),
      deadline_at: daysAgo(2),
      status: "CLOSED",
    },
    {
      source_tender_id: "DEMO-2026-019",
      title: "경기도 공공기관 업무용 컴퓨터 및 주변기기 구매",
      agency_id: agencyMap["DEMO009"],
      demand_agency_name: "경기도청",
      budget_amount: 1_950_000_000,
      region_code: "41", region_name: "경기",
      industry_code: "E001", industry_name: "물품·장비",
      method_type: "일반경쟁",
      published_at: daysAgo(18),
      deadline_at: daysAgo(4),
      status: "CLOSED",
    },
    {
      source_tender_id: "DEMO-2026-020",
      title: "국토부 스마트도로 교통관리 시스템 유지운영",
      agency_id: agencyMap["DEMO013"],
      demand_agency_name: "국토교통부",
      budget_amount: 3_800_000_000,
      region_code: "11", region_name: "서울",
      industry_code: "C009", industry_name: "시설관리",
      method_type: "일반경쟁",
      published_at: daysAgo(22),
      deadline_at: daysAgo(6),
      status: "CLOSED",
    },
    {
      source_tender_id: "DEMO-2026-021",
      title: "보건복지부 의료데이터 표준화 플랫폼 구축",
      agency_id: agencyMap["DEMO014"],
      demand_agency_name: "보건복지부",
      budget_amount: 5_100_000_000,
      region_code: "11", region_name: "서울",
      industry_code: "C006", industry_name: "빅데이터·AI",
      method_type: "일반경쟁",
      published_at: daysAgo(28),
      deadline_at: daysAgo(7),
      status: "CLOSED",
    },
    {
      source_tender_id: "DEMO-2026-022",
      title: "인천시 영종도 공공청사 신축 공사",
      agency_id: agencyMap["DEMO011"],
      demand_agency_name: "인천광역시청",
      budget_amount: 18_500_000_000,
      region_code: "28", region_name: "인천",
      industry_code: "D001", industry_name: "건설·공사",
      method_type: "일반경쟁",
      published_at: daysAgo(35),
      deadline_at: daysAgo(8),
      status: "CLOSED",
    },
    {
      source_tender_id: "DEMO-2026-023",
      title: "과기부 연구데이터 공유포털 고도화 및 운영",
      agency_id: agencyMap["DEMO003"],
      demand_agency_name: "과학기술정보통신부",
      budget_amount: 1_200_000_000,
      region_code: "11", region_name: "서울",
      industry_code: "C001", industry_name: "소프트웨어 개발",
      method_type: "일반경쟁",
      published_at: daysAgo(15),
      deadline_at: daysAgo(2),
      status: "CLOSED",
    },
    {
      source_tender_id: "DEMO-2026-024",
      title: "서울시 청사 통합 경비 및 시설관리 용역",
      agency_id: agencyMap["DEMO001"],
      demand_agency_name: "서울특별시청",
      budget_amount: 2_400_000_000,
      region_code: "11", region_name: "서울",
      industry_code: "F001", industry_name: "용역·서비스",
      method_type: "일반경쟁",
      published_at: daysAgo(40),
      deadline_at: daysAgo(10),
      status: "CLOSED",
    },
    {
      source_tender_id: "DEMO-2026-025",
      title: "조달청 공공조달 AI 자동분류 및 추천 시스템",
      agency_id: agencyMap["DEMO008"],
      demand_agency_name: "조달청",
      budget_amount: 880_000_000,
      region_code: "11", region_name: "서울",
      industry_code: "C006", industry_name: "빅데이터·AI",
      method_type: "제한경쟁",
      published_at: daysAgo(12),
      deadline_at: daysAgo(1),
      status: "CLOSED",
    },

    // ── 결과발표 (RESULT) ─────────────────────────────────
    {
      source_tender_id: "DEMO-2025-101",
      title: "행안부 디지털정부 통합인증(SSO) 시스템 구축",
      agency_id: agencyMap["DEMO004"],
      demand_agency_name: "행정안전부",
      budget_amount: 4_300_000_000,
      region_code: "11", region_name: "서울",
      industry_code: "C001", industry_name: "소프트웨어 개발",
      method_type: "일반경쟁",
      published_at: daysAgo(90),
      deadline_at: daysAgo(60),
      status: "RESULT",
    },
    {
      source_tender_id: "DEMO-2025-102",
      title: "국방부 병영 스마트화 IoT 플랫폼 1차 사업",
      agency_id: agencyMap["DEMO002"],
      demand_agency_name: "국방부",
      budget_amount: 7_800_000_000,
      region_code: "11", region_name: "서울",
      industry_code: "C004", industry_name: "정보통신공사",
      method_type: "제한경쟁",
      published_at: daysAgo(100),
      deadline_at: daysAgo(70),
      status: "RESULT",
    },
    {
      source_tender_id: "DEMO-2025-103",
      title: "서울시 교통카드 차세대 시스템 구축 사업",
      agency_id: agencyMap["DEMO001"],
      demand_agency_name: "서울특별시청",
      budget_amount: 12_500_000_000,
      region_code: "11", region_name: "서울",
      industry_code: "C001", industry_name: "소프트웨어 개발",
      method_type: "일반경쟁",
      published_at: daysAgo(80),
      deadline_at: daysAgo(50),
      status: "RESULT",
    },
    {
      source_tender_id: "DEMO-2025-104",
      title: "경기도 공공빅데이터 플랫폼 구축 1단계",
      agency_id: agencyMap["DEMO009"],
      demand_agency_name: "경기도청",
      budget_amount: 3_200_000_000,
      region_code: "41", region_name: "경기",
      industry_code: "C006", industry_name: "빅데이터·AI",
      method_type: "일반경쟁",
      published_at: daysAgo(75),
      deadline_at: daysAgo(45),
      status: "RESULT",
    },
    {
      source_tender_id: "DEMO-2025-105",
      title: "ETRI AI반도체 설계 SW 개발 플랫폼 구축",
      agency_id: agencyMap["DEMO012"],
      demand_agency_name: "한국전자통신연구원",
      budget_amount: 9_600_000_000,
      region_code: "42", region_name: "대전",
      industry_code: "C006", industry_name: "빅데이터·AI",
      method_type: "제한경쟁",
      published_at: daysAgo(85),
      deadline_at: daysAgo(55),
      status: "RESULT",
    },
    {
      source_tender_id: "DEMO-2025-106",
      title: "부산 스마트항만 디지털트윈 구현 용역",
      agency_id: agencyMap["DEMO010"],
      demand_agency_name: "부산광역시청",
      budget_amount: 6_100_000_000,
      region_code: "26", region_name: "부산",
      industry_code: "C001", industry_name: "소프트웨어 개발",
      method_type: "일반경쟁",
      published_at: daysAgo(92),
      deadline_at: daysAgo(62),
      status: "RESULT",
    },
    {
      source_tender_id: "DEMO-2025-107",
      title: "보건복지부 보건의료빅데이터 플랫폼 3단계",
      agency_id: agencyMap["DEMO014"],
      demand_agency_name: "보건복지부",
      budget_amount: 8_400_000_000,
      region_code: "11", region_name: "서울",
      industry_code: "C006", industry_name: "빅데이터·AI",
      method_type: "일반경쟁",
      published_at: daysAgo(110),
      deadline_at: daysAgo(80),
      status: "RESULT",
    },
    {
      source_tender_id: "DEMO-2025-108",
      title: "국토부 전국 도로시설물 안전점검 용역",
      agency_id: agencyMap["DEMO013"],
      demand_agency_name: "국토교통부",
      budget_amount: 2_100_000_000,
      region_code: "11", region_name: "서울",
      industry_code: "F001", industry_name: "용역·서비스",
      method_type: "일반경쟁",
      published_at: daysAgo(70),
      deadline_at: daysAgo(40),
      status: "RESULT",
    },
    {
      source_tender_id: "DEMO-2025-109",
      title: "조달청 공공물자 품질검사 전자화 시스템 구축",
      agency_id: agencyMap["DEMO008"],
      demand_agency_name: "조달청",
      budget_amount: 1_650_000_000,
      region_code: "11", region_name: "서울",
      industry_code: "C001", industry_name: "소프트웨어 개발",
      method_type: "일반경쟁",
      published_at: daysAgo(65),
      deadline_at: daysAgo(35),
      status: "RESULT",
    },
    {
      source_tender_id: "DEMO-2025-110",
      title: "환경부 탄소중립 이행 모니터링 정보시스템 구축",
      agency_id: agencyMap["DEMO015"],
      demand_agency_name: "환경부",
      budget_amount: 3_900_000_000,
      region_code: "11", region_name: "서울",
      industry_code: "C001", industry_name: "소프트웨어 개발",
      method_type: "일반경쟁",
      published_at: daysAgo(95),
      deadline_at: daysAgo(65),
      status: "RESULT",
    },
  ];
}

// ─── 낙찰 결과 데이터 ─────────────────────────────────────
const AWARD_DATA = {
  "DEMO-2025-101": { winner: "삼성SDS 주식회사", rate: 97.2, offsetDays: 55 },
  "DEMO-2025-102": { winner: "LG CNS 주식회사", rate: 95.8, offsetDays: 65 },
  "DEMO-2025-103": { winner: "SK텔레콤 주식회사", rate: 98.1, offsetDays: 46 },
  "DEMO-2025-104": { winner: "카카오엔터프라이즈", rate: 96.5, offsetDays: 41 },
  "DEMO-2025-105": { winner: "네이버클라우드 주식회사", rate: 94.3, offsetDays: 51 },
  "DEMO-2025-106": { winner: "현대오토에버 주식회사", rate: 97.8, offsetDays: 58 },
  "DEMO-2025-107": { winner: "KT 주식회사", rate: 96.0, offsetDays: 76 },
  "DEMO-2025-108": { winner: "포스코ICT 주식회사", rate: 99.2, offsetDays: 36 },
  "DEMO-2025-109": { winner: "NHN 주식회사", rate: 95.4, offsetDays: 31 },
  "DEMO-2025-110": { winner: "LG유플러스 주식회사", rate: 97.6, offsetDays: 61 },
};

// ─── 메인 시드 함수 ───────────────────────────────────────
async function seedDemo() {
  console.log("🌱 BidSight 데모 데이터 시드 시작...\n");

  // 1. 기관 upsert
  console.log("📋 발주 기관 삽입 중...");
  const { data: agencyRows, error: agencyErr } = await supabase
    .from("agencies")
    .upsert(AGENCIES, { onConflict: "code" })
    .select("id,code");

  if (agencyErr) {
    console.error("❌ 기관 삽입 오류:", agencyErr.message);
    process.exit(1);
  }

  const agencyMap = Object.fromEntries(
    (agencyRows ?? []).map((a) => [a.code, a.id])
  );
  console.log(`  ✅ ${agencyRows?.length || 0}개 기관 완료\n`);

  // 2. 공고 upsert
  console.log("📄 입찰 공고 삽입 중...");
  const tenders = makeTenders(agencyMap);

  const { data: tenderRows, error: tenderErr } = await supabase
    .from("tenders")
    .upsert(tenders, { onConflict: "source_tender_id" })
    .select("id,source_tender_id");

  if (tenderErr) {
    console.error("❌ 공고 삽입 오류:", tenderErr.message);
    process.exit(1);
  }
  console.log(`  ✅ ${tenderRows?.length || 0}건 공고 완료\n`);

  const tenderIdMap = Object.fromEntries(
    (tenderRows ?? []).map((t) => [t.source_tender_id, t.id])
  );

  // 3. 낙찰 결과 upsert
  console.log("🏆 낙찰 결과 삽입 중...");
  const awards = Object.entries(AWARD_DATA)
    .map(([sourceId, info]) => {
      const tenderId = tenderIdMap[sourceId];
      if (!tenderId) return null;
      const tender = tenders.find((t) => t.source_tender_id === sourceId);
      if (!tender) return null;
      return {
        tender_id: tenderId,
        winner_company_name: info.winner,
        awarded_amount: Math.round(Number(tender.budget_amount) * info.rate / 100),
        awarded_rate: info.rate,
        opened_at: daysAgo(info.offsetDays),
      };
    })
    .filter(Boolean);

  const { data: awardRows, error: awardErr } = await supabase
    .from("awards")
    .upsert(awards, { onConflict: "tender_id" })
    .select("id");

  if (awardErr) {
    console.error("❌ 낙찰 결과 삽입 오류:", awardErr.message);
    process.exit(1);
  }
  console.log(`  ✅ ${awardRows?.length || 0}건 낙찰결과 완료\n`);

  // 4. bid intelligence 데이터 (RESULT 공고 대상)
  console.log("🔍 낙찰 분석 데이터 삽입 중...");

  const BID_INTEL = [
    {
      source: "DEMO-2025-101",
      industry: "C001", industry_name: "소프트웨어 개발",
      region: "11", region_name: "서울",
      base_amount: 4_100_000_000, estimated_price: 4_280_000_000,
      lower_limit_rate: 87.745,
      total_bidders: 12, valid_bidders: 10,
      bid_rates: [97.2, 95.8, 93.4, 98.1, 96.0, 94.7, 97.5, 92.3, 95.1, 96.8],
      winner_rate: 97.2,
      winner_company: "삼성SDS 주식회사",
    },
    {
      source: "DEMO-2025-102",
      industry: "C004", industry_name: "정보통신공사",
      region: "11", region_name: "서울",
      base_amount: 7_600_000_000, estimated_price: 7_730_000_000,
      lower_limit_rate: 87.745,
      total_bidders: 8, valid_bidders: 7,
      bid_rates: [95.8, 94.2, 96.5, 93.1, 97.0, 95.4, 94.8],
      winner_rate: 95.8,
      winner_company: "LG CNS 주식회사",
    },
    {
      source: "DEMO-2025-103",
      industry: "C001", industry_name: "소프트웨어 개발",
      region: "11", region_name: "서울",
      base_amount: 12_200_000_000, estimated_price: 12_375_000_000,
      lower_limit_rate: 87.745,
      total_bidders: 15, valid_bidders: 13,
      bid_rates: [98.1, 96.7, 97.3, 95.9, 98.5, 97.0, 96.2, 95.5, 97.8, 98.2, 96.4, 97.1, 95.8],
      winner_rate: 98.1,
      winner_company: "SK텔레콤 주식회사",
    },
    {
      source: "DEMO-2025-104",
      industry: "C006", industry_name: "빅데이터·AI",
      region: "41", region_name: "경기",
      base_amount: 3_100_000_000, estimated_price: 3_168_000_000,
      lower_limit_rate: 87.745,
      total_bidders: 9, valid_bidders: 8,
      bid_rates: [96.5, 95.0, 97.2, 94.3, 96.8, 95.7, 97.0, 94.9],
      winner_rate: 96.5,
      winner_company: "카카오엔터프라이즈",
    },
    {
      source: "DEMO-2025-105",
      industry: "C006", industry_name: "빅데이터·AI",
      region: "42", region_name: "대전",
      base_amount: 9_400_000_000, estimated_price: 9_504_000_000,
      lower_limit_rate: null,
      total_bidders: 6, valid_bidders: 5,
      bid_rates: [94.3, 93.0, 95.1, 92.7, 94.8],
      winner_rate: 94.3,
      winner_company: "네이버클라우드 주식회사",
    },
    {
      source: "DEMO-2025-106",
      industry: "C001", industry_name: "소프트웨어 개발",
      region: "26", region_name: "부산",
      base_amount: 5_900_000_000, estimated_price: 6_039_000_000,
      lower_limit_rate: 87.745,
      total_bidders: 11, valid_bidders: 9,
      bid_rates: [97.8, 96.3, 95.7, 97.2, 96.9, 95.1, 97.5, 96.6, 95.4],
      winner_rate: 97.8,
      winner_company: "현대오토에버 주식회사",
    },
    {
      source: "DEMO-2025-107",
      industry: "C006", industry_name: "빅데이터·AI",
      region: "11", region_name: "서울",
      base_amount: 8_200_000_000, estimated_price: 8_316_000_000,
      lower_limit_rate: 87.745,
      total_bidders: 13, valid_bidders: 11,
      bid_rates: [96.0, 94.8, 95.5, 97.1, 96.3, 94.2, 95.9, 97.4, 96.7, 94.5, 95.2],
      winner_rate: 96.0,
      winner_company: "KT 주식회사",
    },
    {
      source: "DEMO-2025-108",
      industry: "F001", industry_name: "용역·서비스",
      region: "11", region_name: "서울",
      base_amount: 2_050_000_000, estimated_price: 2_079_000_000,
      lower_limit_rate: null,
      total_bidders: 7, valid_bidders: 7,
      bid_rates: [99.2, 98.5, 97.8, 99.0, 98.1, 97.6, 98.8],
      winner_rate: 99.2,
      winner_company: "포스코ICT 주식회사",
    },
    {
      source: "DEMO-2025-109",
      industry: "C001", industry_name: "소프트웨어 개발",
      region: "11", region_name: "서울",
      base_amount: 1_620_000_000, estimated_price: 1_633_500_000,
      lower_limit_rate: 87.745,
      total_bidders: 10, valid_bidders: 9,
      bid_rates: [95.4, 94.1, 96.0, 93.8, 95.7, 94.5, 96.2, 95.0, 94.7],
      winner_rate: 95.4,
      winner_company: "NHN 주식회사",
    },
    {
      source: "DEMO-2025-110",
      industry: "C001", industry_name: "소프트웨어 개발",
      region: "11", region_name: "서울",
      base_amount: 3_800_000_000, estimated_price: 3_861_000_000,
      lower_limit_rate: 87.745,
      total_bidders: 14, valid_bidders: 12,
      bid_rates: [97.6, 96.2, 95.8, 97.3, 96.9, 95.3, 97.0, 96.5, 95.6, 97.4, 96.1, 95.9],
      winner_rate: 97.6,
      winner_company: "LG유플러스 주식회사",
    },
  ];

  let bidNoticeInserted = 0;
  let bidOpenInserted = 0;
  let bidAwardInserted = 0;

  for (const bid of BID_INTEL) {
    const tenderId = tenderIdMap[bid.source];
    if (!tenderId) continue;

    const awardInfo = AWARD_DATA[bid.source];
    const openedAt = daysAgo(awardInfo.offsetDays);

    // bid_notices
    const { data: noticeRow, error: noticeErr } = await supabase
      .from("bid_notices")
      .upsert({
        tender_id: tenderId,
        source_bid_notice_id: `NARA-${bid.source}`,
        notice_number: `2025-${bid.source.replace("DEMO-2025-", "")}`,
        notice_name: tenders.find((t) => t.source_tender_id === bid.source)?.title ?? bid.source,
        demand_organization: tenders.find((t) => t.source_tender_id === bid.source)?.demand_agency_name,
        contract_type: tenders.find((t) => t.source_tender_id === bid.source)?.method_type,
        bid_type: "전자입찰",
        base_amount: bid.base_amount,
        estimated_price: bid.estimated_price,
        lower_limit_rate: bid.lower_limit_rate,
        bid_start_datetime: daysAgo(awardInfo.offsetDays + 30),
        bid_end_datetime: daysAgo(awardInfo.offsetDays + 5),
        open_datetime: openedAt,
        industry_code: bid.industry,
        industry_name: bid.industry_name,
        region_code: bid.region,
        region_name: bid.region_name,
      }, { onConflict: "source_bid_notice_id" })
      .select("id")
      .single();

    if (noticeErr) { console.error("  ⚠ bid_notices 오류:", bid.source, noticeErr.message); continue; }
    bidNoticeInserted++;

    const bidNoticeId = noticeRow.id;
    const sortedRates = [...bid.bid_rates].sort((a, b) => a - b);
    const avgRate = bid.bid_rates.reduce((s, r) => s + r, 0) / bid.bid_rates.length;
    const medianRate = sortedRates[Math.floor(sortedRates.length / 2)];

    // bid_open_results
    const { error: openErr } = await supabase
      .from("bid_open_results")
      .upsert({
        bid_notice_id: bidNoticeId,
        opened_at: openedAt,
        total_bidders: bid.total_bidders,
        valid_bidders: bid.valid_bidders,
        highest_bid_rate: sortedRates[sortedRates.length - 1],
        lowest_bid_rate: sortedRates[0],
        average_bid_rate: Math.round(avgRate * 100) / 100,
        median_bid_rate: medianRate,
        expected_winner_bid_rate: bid.winner_rate,
        expected_winner_amount: Math.round(bid.estimated_price * bid.winner_rate / 100),
        is_successful: true,
      }, { onConflict: "bid_notice_id" });

    if (openErr) { console.error("  ⚠ bid_open_results 오류:", bid.source, openErr.message); }
    else bidOpenInserted++;

    // bid_awards
    const { error: awardErr2 } = await supabase
      .from("bid_awards")
      .upsert({
        bid_notice_id: bidNoticeId,
        winner_company_name: bid.winner_company,
        winner_bid_rate: bid.winner_rate,
        winner_bid_amount: Math.round(bid.estimated_price * bid.winner_rate / 100),
        contract_amount: Math.round(bid.estimated_price * bid.winner_rate / 100),
        contract_date: new Date(daysAgo(awardInfo.offsetDays - 7)).toISOString().slice(0, 10),
        is_final: true,
        awarded_at: openedAt,
      }, { onConflict: "bid_notice_id" });

    if (awardErr2) { console.error("  ⚠ bid_awards 오류:", bid.source, awardErr2.message); }
    else bidAwardInserted++;
  }

  console.log(`  ✅ bid_notices: ${bidNoticeInserted}건`);
  console.log(`  ✅ bid_open_results: ${bidOpenInserted}건`);
  console.log(`  ✅ bid_awards: ${bidAwardInserted}건\n`);

  // 5. 요약
  const openCount = tenders.filter((t) => t.status === "OPEN").length;
  const closedCount = tenders.filter((t) => t.status === "CLOSED").length;
  const resultCount = tenders.filter((t) => t.status === "RESULT").length;
  const urgentCount = tenders.filter((t) => {
    if (t.status !== "OPEN") return false;
    const diff = Math.ceil((new Date(t.deadline_at).getTime() - Date.now()) / 864e5);
    return diff >= 0 && diff <= 3;
  }).length;

  // 6. 데모 계정 생성 (이미 있으면 skip)
  console.log("👤 데모 계정 생성 중...");
  const DEMO_EMAIL = "demo@bidsight.local";
  const DEMO_PASSWORD = "demo1234!";
  try {
    // 기존 계정 확인
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingDemo = existingUsers?.users?.find((u) => u.email === DEMO_EMAIL);
    if (existingDemo) {
      console.log("  ℹ 데모 계정 이미 존재 — 스킵");
    } else {
      const { error: userErr } = await supabase.auth.admin.createUser({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        email_confirm: true,
      });
      if (userErr) {
        console.error("  ⚠ 데모 계정 생성 실패:", userErr.message);
      } else {
        console.log("  ✅ 데모 계정 생성 완료");
      }
    }
  } catch (e) {
    console.error("  ⚠ 데모 계정 생성 중 오류:", e.message);
  }

  console.log("═══════════════════════════════════════════");
  console.log("✨ 데모 데이터 시드 완료!");
  console.log(`   전체 공고: ${tenders.length}건`);
  console.log(`   ├ 진행중:   ${openCount}건 (D-3 이내 긴급: ${urgentCount}건)`);
  console.log(`   ├ 마감:     ${closedCount}건`);
  console.log(`   └ 결과발표: ${resultCount}건`);
  console.log(`   낙찰 결과(awards): ${awardRows?.length || 0}건`);
  console.log(`   낙찰 분석(bid_awards): ${bidAwardInserted}건`);
  console.log("═══════════════════════════════════════════");
  console.log("\n🔑 데모 로그인 정보:");
  console.log(`   이메일: ${DEMO_EMAIL}`);
  console.log(`   비밀번호: ${DEMO_PASSWORD}`);
  console.log("\n👉 http://localhost:3000/login 에서 위 계정으로 로그인하세요!");
}

seedDemo().catch((e) => {
  console.error("치명적 오류:", e);
  process.exit(1);
});
