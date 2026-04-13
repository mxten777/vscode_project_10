"use client";

import { useEffect, useState } from "react";
import { useCompanyProfile, useUpdateCompanyProfile } from "@/hooks/use-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Building, X, Loader2, Info } from "lucide-react";

// 주요 업종 코드 목록 (간소화)
const INDUSTRY_OPTIONS = [
  { code: "SW", label: "소프트웨어 개발" },
  { code: "IT", label: "IT/정보화" },
  { code: "CN", label: "건설·공사" },
  { code: "SV", label: "용역·서비스" },
  { code: "GD", label: "물품·장비" },
  { code: "FM", label: "시설관리" },
  { code: "DS", label: "디자인·출판" },
  { code: "ED", label: "교육·연구" },
];

// 주요 지역 코드 목록
const REGION_OPTIONS = [
  { code: "11", label: "서울" },
  { code: "26", label: "부산" },
  { code: "27", label: "대구" },
  { code: "28", label: "인천" },
  { code: "29", label: "광주" },
  { code: "30", label: "대전" },
  { code: "31", label: "울산" },
  { code: "36", label: "세종" },
  { code: "41", label: "경기" },
  { code: "42", label: "강원" },
  { code: "43", label: "충북" },
  { code: "44", label: "충남" },
  { code: "45", label: "전북" },
  { code: "46", label: "전남" },
  { code: "47", label: "경북" },
  { code: "48", label: "경남" },
  { code: "50", label: "제주" },
];

function TagInput({
  values,
  onChange,
  placeholder,
}: {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState("");

  const add = () => {
    const trimmed = input.trim();
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed]);
    }
    setInput("");
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className="flex-1"
        />
        <Button type="button" variant="outline" size="sm" onClick={add}>
          추가
        </Button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((v) => (
            <Badge key={v} variant="secondary" className="gap-1 pr-1">
              {v}
              <button
                type="button"
                onClick={() => onChange(values.filter((x) => x !== v))}
                className="hover:text-destructive transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function ToggleChipGroup({
  options,
  selected,
  onChange,
}: {
  options: { code: string; label: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
}) {
  const toggle = (code: string) => {
    onChange(
      selected.includes(code)
        ? selected.filter((c) => c !== code)
        : [...selected, code]
    );
  };

  return (
    <div className="flex flex-wrap gap-2">
      {options.map(({ code, label }) => {
        const active = selected.includes(code);
        return (
          <button
            key={code}
            type="button"
            onClick={() => toggle(code)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
              active
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export default function CompanySettingsPage() {
  const { data: profile, isLoading } = useCompanyProfile();
  const updateProfile = useUpdateCompanyProfile();

  const [companyName, setCompanyName] = useState("");
  const [industryCodes, setIndustryCodes] = useState<string[]>([]);
  const [regionCodes, setRegionCodes] = useState<string[]>([]);
  const [preferredAgencies, setPreferredAgencies] = useState<string[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [minBudget, setMinBudget] = useState("");
  const [maxBudget, setMaxBudget] = useState("");

  // 프로파일 로드 시 폼에 반영
  useEffect(() => {
    if (profile) {
      setCompanyName(profile.company_name ?? "");
      setIndustryCodes(profile.industry_codes ?? []);
      setRegionCodes(profile.region_codes ?? []);
      setPreferredAgencies(profile.preferred_agency_names ?? []);
      setKeywords(profile.keywords ?? []);
      setMinBudget(profile.min_budget != null ? String(profile.min_budget / 10000) : "");
      setMaxBudget(profile.max_budget != null ? String(profile.max_budget / 10000) : "");
    }
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const minNum = minBudget ? parseFloat(minBudget) * 10000 : null;
    const maxNum = maxBudget ? parseFloat(maxBudget) * 10000 : null;

    if (minNum != null && maxNum != null && minNum > maxNum) {
      toast.error("최소 예산은 최대 예산보다 작아야 합니다");
      return;
    }

    try {
      await updateProfile.mutateAsync({
        company_name: companyName || null,
        industry_codes: industryCodes,
        region_codes: regionCodes,
        preferred_agency_names: preferredAgencies,
        keywords,
        min_budget: minNum,
        max_budget: maxNum,
      });
      toast.success("회사 정보가 저장되었습니다");
    } catch {
      toast.error("저장 중 오류가 발생했습니다");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-40 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">

      {/* 안내 배너 */}
      <div className="flex items-start gap-3 rounded-xl border border-violet-500/20 bg-violet-500/5 px-4 py-3">
        <Info className="h-4 w-4 text-violet-500 shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          회사 정보를 입력하면 <strong className="text-foreground">AI 추천 공고</strong>가 
          귀사의 업종·지역·예산에 맞게 개인화됩니다. 모든 필드는 선택사항입니다.
        </p>
      </div>

      {/* 기본 정보 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm">기본 정보</CardTitle>
          </div>
          <CardDescription className="text-xs">회사명 및 입찰 선호 프로파일</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="company-name" className="text-xs font-medium">회사명</Label>
            <Input
              id="company-name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="예: (주)바이칼솔루션"
              maxLength={100}
            />
          </div>
        </CardContent>
      </Card>

      {/* 업종 선택 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">주력 업종</CardTitle>
          <CardDescription className="text-xs">
            선택한 업종의 공고를 우선 추천합니다 (복수 선택 가능)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ToggleChipGroup
            options={INDUSTRY_OPTIONS}
            selected={industryCodes}
            onChange={setIndustryCodes}
          />
        </CardContent>
      </Card>

      {/* 활동 지역 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">활동 지역</CardTitle>
          <CardDescription className="text-xs">
            선택한 지역의 공고를 우선 추천합니다 (복수 선택 가능)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ToggleChipGroup
            options={REGION_OPTIONS}
            selected={regionCodes}
            onChange={setRegionCodes}
          />
        </CardContent>
      </Card>

      {/* 목표 예산 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">목표 예산 범위</CardTitle>
          <CardDescription className="text-xs">참가하는 입찰의 예산 범위를 설정합니다</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs">최소 (만원)</Label>
              <Input
                type="number"
                value={minBudget}
                onChange={(e) => setMinBudget(e.target.value)}
                placeholder="예: 5000"
                min={0}
              />
            </div>
            <span className="text-muted-foreground mt-5">~</span>
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs">최대 (만원)</Label>
              <Input
                type="number"
                value={maxBudget}
                onChange={(e) => setMaxBudget(e.target.value)}
                placeholder="예: 50000"
                min={0}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 선호 기관 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">선호 발주기관</CardTitle>
          <CardDescription className="text-xs">
            특정 기관 이름을 입력하면 해당 기관 공고가 우선 추천됩니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TagInput
            values={preferredAgencies}
            onChange={setPreferredAgencies}
            placeholder="기관명 입력 후 Enter (예: 조달청)"
          />
        </CardContent>
      </Card>

      {/* 관심 키워드 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">관심 키워드</CardTitle>
          <CardDescription className="text-xs">
            공고 제목에 포함될 키워드를 입력합니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TagInput
            values={keywords}
            onChange={setKeywords}
            placeholder="키워드 입력 후 Enter (예: AI, 디지털전환)"
          />
        </CardContent>
      </Card>

      {/* AI 점수 계산 방식 설명 패널 */}
      <Card className="border-violet-500/20 bg-violet-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Info className="h-4 w-4 text-violet-500" />
            AI 점수 계산 방식 안내
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs text-muted-foreground">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { label: "주력 업종 설정 시", desc: "해당 업종의 낙찰 패턴 가중치 +30%", source: "실데이터" },
              { label: "활동 지역 설정 시", desc: "해당 지역의 낙찰 패턴 가중치 +15%", source: "실데이터" },
              { label: "선호 기관 설정 시", desc: "해당 기관의 낙찰률 평균 가중치 +25%", source: "실데이터" },
              { label: "목표 예산 범위 설정 시", desc: "예산 범위 내 공고에 우선순위 부여", source: "설정값" },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-2 rounded-lg border border-violet-200/30 bg-background/50 p-2">
                <span className={`shrink-0 rounded px-1 py-0.5 text-[9px] font-bold ${
                  item.source === "실데이터"
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                    : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                }`}>{item.source}</span>
                <div>
                  <p className="font-medium text-foreground">{item.label}</p>
                  <p>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="pt-1 text-[11px] text-muted-foreground/60">
            ※ 설정 후 AI 추천 점수가 자동으로 재계산됩니다. 낙찰 데이터가 부족한 항목은 "분석 준비 중"으로 표시됩니다.
          </p>
        </CardContent>
      </Card>

      <Button type="submit" disabled={updateProfile.isPending} className="w-full">
        {updateProfile.isPending ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            저장 중...
          </>
        ) : (
          "회사 정보 저장"
        )}
      </Button>
    </form>
  );
}
