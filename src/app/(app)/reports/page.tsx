"use client";

import { useState } from "react";
import { useReportSummary } from "@/hooks/use-api";
import { formatKRW } from "@/lib/helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart3,
  FileText,
  Building,
  Briefcase,
  Banknote,
  PieChart,
  CalendarDays,
} from "lucide-react";

export default function ReportsPage() {
  // 기간 선택
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const fromISO = from ? new Date(from).toISOString() : undefined;
  const toISO = to ? new Date(to + "T23:59:59").toISOString() : undefined;

  const { data, isLoading } = useReportSummary(fromISO, toISO);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          리포트
        </h1>
        <p className="text-muted-foreground mt-1">
          기간별 입찰 공고 통계를 확인하세요
        </p>
      </div>

      {/* 기간 선택 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-end gap-3">
            <div className="space-y-2 flex-1">
              <Label className="flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" />
                시작일
              </Label>
              <Input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2 flex-1">
              <Label className="flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" />
                종료일
              </Label>
              <Input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setFrom("");
                setTo("");
              }}
            >
              초기화
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </div>
      )}

      {data && (
        <>
          {/* 요약 카드 */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              icon={<FileText className="h-5 w-5" />}
              title="총 공고 수"
              value={data.totalTenders.toLocaleString()}
              suffix="건"
            />
            <SummaryCard
              icon={<Banknote className="h-5 w-5" />}
              title="총 예산"
              value={formatKRW(data.totalBudget)}
            />
            <SummaryCard
              icon={<Building className="h-5 w-5" />}
              title="발주 기관"
              value={String(data.topAgencies.length)}
              suffix="개 (TOP)"
            />
            <SummaryCard
              icon={<Briefcase className="h-5 w-5" />}
              title="업종"
              value={String(data.topIndustries.length)}
              suffix="개 (TOP)"
            />
          </div>

          {/* 상태 분포 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <PieChart className="h-4 w-4" />
                상태 분포
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {data.statusDistribution.map((s) => (
                  <div
                    key={s.status}
                    className="flex items-center gap-2 rounded-lg border px-4 py-2"
                  >
                    <Badge
                      variant={
                        s.status === "OPEN"
                          ? "default"
                          : s.status === "CLOSED"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {s.status === "OPEN"
                        ? "진행중"
                        : s.status === "CLOSED"
                        ? "마감"
                        : "결과발표"}
                    </Badge>
                    <span className="font-semibold text-lg">
                      {s.count.toLocaleString()}
                    </span>
                    <span className="text-sm text-muted-foreground">건</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* TOP 기관 & 업종 */}
          <div className="grid gap-4 md:grid-cols-2">
            <RankCard
              title="TOP 발주기관"
              icon={<Building className="h-4 w-4" />}
              items={data.topAgencies}
            />
            <RankCard
              title="TOP 업종"
              icon={<Briefcase className="h-4 w-4" />}
              items={data.topIndustries}
            />
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({
  icon,
  title,
  value,
  suffix,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  suffix?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          {icon}
          <span className="text-sm">{title}</span>
        </div>
        <p className="text-2xl font-bold">
          {value}
          {suffix && (
            <span className="text-sm font-normal text-muted-foreground ml-1">
              {suffix}
            </span>
          )}
        </p>
      </CardContent>
    </Card>
  );
}

function RankCard({
  title,
  icon,
  items,
}: {
  title: string;
  icon: React.ReactNode;
  items: { name: string; count: number }[];
}) {
  const max = items.length > 0 ? items[0].count : 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
        <CardDescription>상위 10개</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground">데이터 없음</p>
        )}
        {items.map((item, i) => (
          <div key={item.name} className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-5 text-right">
              {i + 1}
            </span>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-sm truncate">{item.name}</span>
                <span className="text-sm font-medium shrink-0 ml-2">
                  {item.count}건
                </span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${(item.count / max) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
