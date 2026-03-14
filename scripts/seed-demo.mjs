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
        const value = trimmed.slice(eqIdx + 1).trim();
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

  // 4. 요약
  const openCount = tenders.filter((t) => t.status === "OPEN").length;
  const closedCount = tenders.filter((t) => t.status === "CLOSED").length;
  const resultCount = tenders.filter((t) => t.status === "RESULT").length;
  const urgentCount = tenders.filter((t) => {
    if (t.status !== "OPEN") return false;
    const diff = Math.ceil((new Date(t.deadline_at).getTime() - Date.now()) / 864e5);
    return diff >= 0 && diff <= 3;
  }).length;

  console.log("═══════════════════════════════════════════");
  console.log("✨ 데모 데이터 시드 완료!");
  console.log(`   전체 공고: ${tenders.length}건`);
  console.log(`   ├ 진행중:   ${openCount}건 (D-3 이내 긴급: ${urgentCount}건)`);
  console.log(`   ├ 마감:     ${closedCount}건`);
  console.log(`   └ 결과발표: ${resultCount}건`);
  console.log(`   낙찰 결과: ${awardRows?.length || 0}건`);
  console.log("═══════════════════════════════════════════");
  console.log("\n👉 http://localhost:3000 을 새로고침하세요!");
}

seedDemo().catch((e) => {
  console.error("치명적 오류:", e);
  process.exit(1);
});
