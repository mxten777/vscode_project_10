"use client";

import { useDeferredValue, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  Building2,
  Check,
  Clock3,
  Filter,
  Loader2,
  Mail,
  Play,
  RefreshCcw,
  Search,
  ShieldEllipsis,
  Trash2,
  Users,
  Workflow,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type RunAction =
  | "cron-ingest"
  | "cron-maintenance"
  | "poll-tenders"
  | "collect-bid-awards"
  | "process-alerts"
  | "rebuild-analysis"
  | "collect-participants"
  | "cleanup";
type OrgPlan = "free" | "pro" | "enterprise";
type LogStatusFilter = "all" | "running" | "success" | "failed";

interface OperationsData {
  status: {
    system_ok: boolean;
    computed_at: string;
    running_jobs: string[];
    recent_failures: Array<{ job_type: string; at: string | null; message: string | null }>;
  };
  metrics: {
    org_count: number;
    member_count: number;
    pending_invitation_count: number;
    running_job_count: number;
    recent_failure_count: number;
  };
  plan_counts: Record<string, number>;
  organizations: Array<{
    id: string;
    name: string;
    plan: OrgPlan;
    created_at: string | null;
    member_count: number;
    admin_count: number;
    pending_invitation_count: number;
    subscription: {
      plan: OrgPlan;
      status: string;
      has_stripe: boolean;
      current_period_end: string | null;
    } | null;
  }>;
  users: Array<{
    user_id: string;
    email: string;
    org_id: string | null;
    org_name: string | null;
    role: string | null;
    joined_at: string | null;
    last_sign_in_at: string | null;
    created_at: string | null;
  }>;
  invitations: Array<{
    id: string;
    org_id: string | null;
    org_name: string | null;
    email: string;
    role: string;
    expires_at: string | null;
    created_at: string | null;
  }>;
  log_filters: {
    status: LogStatusFilter;
    job_type: string;
    limit: number;
  };
  available_actions: string[];
  recent_logs: Array<{
    id: string;
    job_type: string | null;
    status: string | null;
    started_at: string | null;
    finished_at: string | null;
    created_at: string | null;
    records_collected: number | null;
    error_message: string | null;
  }>;
}

async function fetchOperations(filters: { logStatus: LogStatusFilter; logJobType: string; logLimit: number }): Promise<OperationsData> {
  const search = new URLSearchParams({
    logStatus: filters.logStatus,
    logJobType: filters.logJobType,
    logLimit: String(filters.logLimit),
  });
  const res = await fetch(`/api/admin/operations?${search.toString()}`, { cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message ?? "운영 콘솔 조회 실패");
  return data;
}

async function runAction(action: RunAction) {
  const res = await fetch("/api/admin/operations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message ?? `${action} 실행 실패`);
  return data;
}

async function updateOrganization(payload: { orgId: string; plan?: OrgPlan; name?: string }) {
  const res = await fetch("/api/admin/operations", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message ?? "플랜 변경 실패");
  return data;
}

function formatRelativeTime(iso: string | null | undefined) {
  if (!iso) return "없음";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "방금";
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

function formatJobLabel(jobType: string | null) {
  switch (jobType) {
    case "tenders":
      return "공고 수집";
    case "awards":
      return "낙찰 수집";
    case "alerts":
      return "알림 처리";
    case "participants":
      return "참여업체 수집";
    case "analysis_rebuild":
      return "분석 재구성";
    case "cleanup":
      return "정리 작업";
    default:
      return jobType ?? "unknown";
  }
}

const actions: Array<{ action: RunAction; title: string; description: string }> = [
  {
    action: "cron-ingest",
    title: "수집 오케스트레이터 실행",
    description: "공고 수집과 최근 낙찰 수집을 즉시 한 번 실행합니다.",
  },
  {
    action: "cron-maintenance",
    title: "정비 오케스트레이터 실행",
    description: "알림 처리, 분석 재구성, 참여업체 수집 등 유지 작업을 즉시 실행합니다.",
  },
  {
    action: "poll-tenders",
    title: "공고 수집만 실행",
    description: "나라장터 공고 수집만 바로 실행합니다.",
  },
  {
    action: "collect-bid-awards",
    title: "낙찰 수집만 실행",
    description: "최근 낙찰 결과 수집만 별도로 실행합니다.",
  },
  {
    action: "process-alerts",
    title: "알림 처리만 실행",
    description: "대기 중 알림 규칙을 즉시 평가하고 이메일 발송을 시도합니다.",
  },
  {
    action: "rebuild-analysis",
    title: "분석 재구성만 실행",
    description: "요약/분석 캐시를 다시 계산합니다.",
  },
  {
    action: "collect-participants",
    title: "참여업체 수집만 실행",
    description: "대상 공고의 참여업체 데이터를 별도로 채웁니다.",
  },
  {
    action: "cleanup",
    title: "정리 작업만 실행",
    description: "오래된 로그와 보조 테이블 정리 작업을 즉시 실행합니다.",
  },
];

const logStatusOptions: Array<{ value: LogStatusFilter; label: string }> = [
  { value: "all", label: "모든 상태" },
  { value: "running", label: "실행 중" },
  { value: "success", label: "성공" },
  { value: "failed", label: "실패" },
];

const logLimitOptions = [8, 20, 50];

export function AdminOperationsConsole() {
  const queryClient = useQueryClient();
  const [draftPlans, setDraftPlans] = useState<Record<string, OrgPlan>>({});
  const [draftOrgNames, setDraftOrgNames] = useState<Record<string, string>>({});
  const [draftUserRoles, setDraftUserRoles] = useState<Record<string, "admin" | "member">>({});
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState<"all" | "admin" | "member">("all");
  const [userOrgFilter, setUserOrgFilter] = useState("all");
  const [logStatus, setLogStatus] = useState<LogStatusFilter>("all");
  const [logJobType, setLogJobType] = useState("all");
  const [logLimit, setLogLimit] = useState(8);
  const deferredUserSearch = useDeferredValue(userSearch.trim().toLowerCase());
  const { data, isLoading } = useQuery({
    queryKey: ["admin-operations", logStatus, logJobType, logLimit],
    queryFn: () => fetchOperations({ logStatus, logJobType, logLimit }),
    staleTime: 1000 * 30,
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: runAction,
    onSuccess: (payload) => {
      toast.success(payload.message ?? "작업을 시작했습니다");
      queryClient.invalidateQueries({ queryKey: ["admin-operations"] });
      queryClient.invalidateQueries({ queryKey: ["ingestion-status"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const planMutation = useMutation({
    mutationFn: updateOrganization,
    onSuccess: (payload) => {
      toast.success(payload.message ?? "플랜을 변경했습니다");
      queryClient.invalidateQueries({ queryKey: ["admin-operations"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const memberRoleMutation = useMutation({
    mutationFn: async (payload: { orgId: string; userId: string; role: "admin" | "member" }) => {
      const res = await fetch("/api/admin/operations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message ?? "권한 변경 실패");
      return data;
    },
    onSuccess: (payload) => {
      toast.success(payload.message ?? "권한을 변경했습니다");
      queryClient.invalidateQueries({ queryKey: ["admin-operations"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const memberDeleteMutation = useMutation({
    mutationFn: async (payload: { orgId: string; userId: string }) => {
      const res = await fetch("/api/admin/operations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message ?? "멤버 제거 실패");
      return data;
    },
    onSuccess: (payload) => {
      toast.success(payload.message ?? "멤버를 제거했습니다");
      queryClient.invalidateQueries({ queryKey: ["admin-operations"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const invitationDeleteMutation = useMutation({
    mutationFn: async (payload: { inviteId: string }) => {
      const res = await fetch("/api/admin/operations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message ?? "초대 취소 실패");
      return data;
    },
    onSuccess: (payload) => {
      toast.success(payload.message ?? "초대를 취소했습니다");
      queryClient.invalidateQueries({ queryKey: ["admin-operations"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const metricCards = data
    ? [
        { label: "조직 수", value: `${data.metrics.org_count}`, icon: Building2 },
        { label: "활성 멤버 수", value: `${data.metrics.member_count}`, icon: Users },
        { label: "대기 중 초대", value: `${data.metrics.pending_invitation_count}`, icon: Clock3 },
        { label: "실행 중 배치", value: `${data.metrics.running_job_count}`, icon: Workflow },
      ]
    : [];

  const organizations = data?.organizations ?? [];
  const users = data?.users ?? [];
  const invitations = data?.invitations ?? [];
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      deferredUserSearch.length === 0 ||
      user.email.toLowerCase().includes(deferredUserSearch) ||
      (user.org_name ?? "").toLowerCase().includes(deferredUserSearch);
    const matchesRole = userRoleFilter === "all" || user.role === userRoleFilter;
    const matchesOrg = userOrgFilter === "all" || user.org_id === userOrgFilter;
    return matchesSearch && matchesRole && matchesOrg;
  });

  return (
    <div className="space-y-6 animate-fade-up">
      <Card className="premium-card overflow-hidden border-primary/15 bg-primary/4">
        <CardContent className="px-6 py-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-background/80 px-3 py-1 text-xs font-medium text-primary">
                <ShieldEllipsis className="h-3.5 w-3.5" />
                관리자 전용
              </div>
              <h1 className="mt-3 text-3xl font-extrabold tracking-tight">운영 콘솔</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                시스템 상태를 빠르게 확인하고, 정기 배치를 기다리지 않고 핵심 오케스트레이터를 수동 실행할 수 있습니다.
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/80 px-4 py-3 text-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">현재 상태</p>
              <div className="mt-2 flex items-center gap-2">
                <Badge variant="outline" className={data?.status.system_ok ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}>
                  {data?.status.system_ok ? "정상" : "주의"}
                </Badge>
                <span className="text-muted-foreground">최근 갱신 {formatRelativeTime(data?.status.computed_at)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-3xl" />)
          : metricCards.map((item) => {
              const Icon = item.icon;

              return (
                <Card key={item.label} className="premium-card">
                  <CardContent className="flex items-center gap-4 px-5 py-5">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{item.label}</p>
                      <p className="mt-1 text-2xl font-bold tracking-tight">{item.value}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="premium-card">
          <CardHeader>
            <CardTitle className="text-base">수동 실행</CardTitle>
            <CardDescription>오케스트레이터 전체 실행과 개별 job 실행을 바로 선택할 수 있습니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {actions.map((item) => {
              const running = mutation.isPending && mutation.variables === item.action;

              return (
                <div key={item.action} className="flex flex-col gap-3 rounded-2xl border border-border/60 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="font-medium text-foreground">{item.title}</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.description}</p>
                  </div>
                  <Button onClick={() => mutation.mutate(item.action)} disabled={mutation.isPending} className="gap-2 self-start lg:self-center">
                    {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                    실행
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardHeader>
            <CardTitle className="text-base">플랜 분포</CardTitle>
            <CardDescription>현재 저장된 조직 플랜의 대략적인 운영 분포입니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-full" />
              </div>
            ) : Object.keys(data?.plan_counts ?? {}).length === 0 ? (
              <p className="text-muted-foreground">표시할 플랜 데이터가 없습니다.</p>
            ) : (
              Object.entries(data?.plan_counts ?? {}).map(([plan, count]) => (
                <div key={plan} className="flex items-center justify-between rounded-2xl border border-border/60 px-4 py-3">
                  <span className="font-medium capitalize text-foreground">{plan}</span>
                  <Badge variant="secondary">{count}개 조직</Badge>
                </div>
              ))
            )}
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-xs text-amber-900">
              최근 실패 {data?.metrics.recent_failure_count ?? 0}건, 실행 중 작업 {data?.metrics.running_job_count ?? 0}건
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="text-base">조직 플랜 관리</CardTitle>
          <CardDescription>한도와 결제 화면이 어긋나지 않도록 조직 플랜과 구독 레코드를 함께 동기화합니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-20 w-full rounded-2xl" />
              ))}
            </div>
          ) : organizations.length ? (
            organizations.map((org) => {
              const selectedPlan = draftPlans[org.id] ?? org.plan;
              const selectedName = draftOrgNames[org.id] ?? org.name;
              const dirty = selectedPlan !== org.plan || selectedName.trim() !== org.name;
              const saving = planMutation.isPending && planMutation.variables?.orgId === org.id;

              return (
                <div key={org.id} className="flex flex-col gap-4 rounded-2xl border border-border/60 px-4 py-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Input
                        value={selectedName}
                        onChange={(event) => {
                          setDraftOrgNames((current) => ({
                            ...current,
                            [org.id]: event.target.value,
                          }));
                        }}
                        className="max-w-xs"
                        aria-label={`${org.name} 조직명`}
                      />
                      <Badge variant="outline" className="capitalize">{org.plan}</Badge>
                      {org.subscription?.has_stripe ? <Badge variant="secondary">Stripe 연결</Badge> : null}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      멤버 {org.member_count}명 · 관리자 {org.admin_count}명 · 대기 초대 {org.pending_invitation_count}건 · 생성 {formatRelativeTime(org.created_at)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      구독 상태 {org.subscription?.status ?? "없음"}
                      {org.subscription?.current_period_end ? ` · 만료 ${formatRelativeTime(org.subscription.current_period_end)}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Select
                      value={selectedPlan}
                      onValueChange={(value) => {
                        setDraftPlans((current) => ({
                          ...current,
                          [org.id]: value as OrgPlan,
                        }));
                      }}
                    >
                      <SelectTrigger className="w-full sm:w-40">
                        <SelectValue placeholder="플랜 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">Free</SelectItem>
                        <SelectItem value="pro">Pro</SelectItem>
                        <SelectItem value="enterprise">Enterprise</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant={dirty ? "default" : "outline"}
                      disabled={!dirty || saving}
                      onClick={() =>
                        planMutation.mutate({
                          orgId: org.id,
                          plan: selectedPlan !== org.plan ? selectedPlan : undefined,
                          name: selectedName.trim() !== org.name ? selectedName.trim() : undefined,
                        })
                      }
                      className="gap-2"
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      저장
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={!dirty || saving}
                      onClick={() => {
                        setDraftPlans((current) => ({
                          ...current,
                          [org.id]: org.plan,
                        }));
                        setDraftOrgNames((current) => ({
                          ...current,
                          [org.id]: org.name,
                        }));
                      }}
                      className="gap-2"
                    >
                      <RefreshCcw className="h-4 w-4" />
                      되돌리기
                    </Button>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground">표시할 조직이 없습니다.</p>
          )}
        </CardContent>
      </Card>

      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="text-base">전체 사용자 목록</CardTitle>
          <CardDescription>조직 전체 사용자와 최근 로그인 상태를 검색과 필터로 빠르게 좁혀봅니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-border/60 px-4 py-4 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={userSearch}
                onChange={(event) => setUserSearch(event.target.value)}
                placeholder="이메일 또는 조직명으로 검색"
                className="pl-9"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:w-90">
              <Select value={userRoleFilter} onValueChange={(value) => setUserRoleFilter(value as "all" | "admin" | "member") }>
                <SelectTrigger>
                  <SelectValue placeholder="권한 필터" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">모든 권한</SelectItem>
                  <SelectItem value="admin">admin</SelectItem>
                  <SelectItem value="member">member</SelectItem>
                </SelectContent>
              </Select>
              <Select value={userOrgFilter} onValueChange={setUserOrgFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="조직 필터" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">모든 조직</SelectItem>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          ) : filteredUsers.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이메일</TableHead>
                  <TableHead>조직</TableHead>
                  <TableHead>권한</TableHead>
                  <TableHead>가입</TableHead>
                  <TableHead>최근 로그인</TableHead>
                  <TableHead>관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={`${user.user_id}-${user.org_id ?? "none"}`}>
                    <TableCell className="font-medium text-foreground">{user.email || "이메일 없음"}</TableCell>
                    <TableCell>{user.org_name ?? "미소속"}</TableCell>
                    <TableCell>
                      {user.org_id ? (
                        <div className="flex items-center gap-2">
                          <Select
                            value={draftUserRoles[`${user.org_id}:${user.user_id}`] ?? ((user.role as "admin" | "member" | null) ?? "member")}
                            onValueChange={(value) => {
                              setDraftUserRoles((current) => ({
                                ...current,
                                [`${user.org_id}:${user.user_id}`]: value as "admin" | "member",
                              }));
                            }}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue placeholder="권한" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">admin</SelectItem>
                              <SelectItem value="member">member</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={memberRoleMutation.isPending || (draftUserRoles[`${user.org_id}:${user.user_id}`] ?? user.role) === user.role}
                            onClick={() => {
                              if (!user.org_id) return;
                              memberRoleMutation.mutate({
                                orgId: user.org_id,
                                userId: user.user_id,
                                role: (draftUserRoles[`${user.org_id}:${user.user_id}`] ?? user.role ?? "member") as "admin" | "member",
                              });
                            }}
                          >
                            저장
                          </Button>
                        </div>
                      ) : (
                        <Badge variant="secondary">{user.role ?? "unknown"}</Badge>
                      )}
                    </TableCell>
                    <TableCell>{formatRelativeTime(user.created_at ?? user.joined_at)}</TableCell>
                    <TableCell>{formatRelativeTime(user.last_sign_in_at)}</TableCell>
                    <TableCell>
                      {user.org_id ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          disabled={memberDeleteMutation.isPending}
                          onClick={() => {
                            memberDeleteMutation.mutate({ orgId: user.org_id!, userId: user.user_id });
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">선택한 조건에 맞는 사용자가 없습니다.</p>
          )}
        </CardContent>
      </Card>

      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="text-base">대기 중인 초대</CardTitle>
          <CardDescription>아직 수락되지 않은 초대를 운영 콘솔에서 바로 정리합니다.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          ) : invitations.length ? (
            <div className="space-y-3">
              {invitations.map((invite) => (
                <div key={invite.id} className="flex flex-col gap-3 rounded-2xl border border-border/60 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <p className="truncate font-medium text-foreground">{invite.email}</p>
                      <Badge variant="outline">{invite.role}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {invite.org_name ?? "미지정 조직"} · 생성 {formatRelativeTime(invite.created_at)} · 만료 {formatRelativeTime(invite.expires_at)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    className="gap-2 text-destructive"
                    disabled={invitationDeleteMutation.isPending}
                    onClick={() => invitationDeleteMutation.mutate({ inviteId: invite.id })}
                  >
                    <Trash2 className="h-4 w-4" />
                    초대 취소
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">대기 중인 초대가 없습니다.</p>
          )}
        </CardContent>
      </Card>

      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="text-base">대기 중인 초대</CardTitle>
          <CardDescription>아직 수락되지 않은 초대를 운영 콘솔에서 바로 정리합니다.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          ) : invitations.length ? (
            <div className="space-y-3">
              {invitations.map((invite) => (
                <div key={invite.id} className="flex flex-col gap-3 rounded-2xl border border-border/60 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <p className="truncate font-medium text-foreground">{invite.email}</p>
                      <Badge variant="outline">{invite.role}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {invite.org_name ?? "미지정 조직"} · 생성 {formatRelativeTime(invite.created_at)} · 만료 {formatRelativeTime(invite.expires_at)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    className="gap-2 text-destructive"
                    disabled={invitationDeleteMutation.isPending}
                    onClick={() => invitationDeleteMutation.mutate({ inviteId: invite.id })}
                  >
                    <Trash2 className="h-4 w-4" />
                    초대 취소
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">대기 중인 초대가 없습니다.</p>
          )}
        </CardContent>
      </Card>

      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="text-base">최근 작업 로그</CardTitle>
          <CardDescription>collection_logs 기준 최근 실행 결과를 상태와 작업별로 좁혀서 확인합니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-3 rounded-2xl border border-border/60 px-4 py-4 lg:flex-row lg:items-center">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Filter className="h-4 w-4 text-muted-foreground" />
              로그 필터
            </div>
            <div className="grid flex-1 gap-3 sm:grid-cols-3">
              <Select value={logStatus} onValueChange={(value) => setLogStatus(value as LogStatusFilter)}>
                <SelectTrigger>
                  <SelectValue placeholder="상태" />
                </SelectTrigger>
                <SelectContent>
                  {logStatusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={logJobType} onValueChange={setLogJobType}>
                <SelectTrigger>
                  <SelectValue placeholder="작업 종류" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">모든 작업</SelectItem>
                  {Array.from(new Set((data?.recent_logs ?? []).map((log) => log.job_type).filter((value): value is string => Boolean(value)))).map((jobType) => (
                    <SelectItem key={jobType} value={jobType}>{formatJobLabel(jobType)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={String(logLimit)} onValueChange={(value) => setLogLimit(parseInt(value, 10))}>
                <SelectTrigger>
                  <SelectValue placeholder="개수" />
                </SelectTrigger>
                <SelectContent>
                  {logLimitOptions.map((value) => (
                    <SelectItem key={value} value={String(value)}>{value}개</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-16 w-full rounded-2xl" />
              ))}
            </div>
          ) : data?.recent_logs.length ? (
            data.recent_logs.map((log) => {
              const failed = ["failed", "error"].includes((log.status ?? "").toLowerCase());
              const finished = ["completed", "success", "succeeded"].includes((log.status ?? "").toLowerCase());

              return (
                <div key={log.id} className="flex flex-col gap-3 rounded-2xl border border-border/60 px-4 py-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">{formatJobLabel(log.job_type)}</p>
                      <Badge variant="outline" className={failed ? "border-rose-200 bg-rose-50 text-rose-700" : finished ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}>
                        {log.status ?? "unknown"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      시작 {formatRelativeTime(log.started_at ?? log.created_at)} · 종료 {formatRelativeTime(log.finished_at)}
                    </p>
                    {log.error_message ? (
                      <p className="flex items-start gap-2 text-sm text-rose-600">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{log.error_message}</span>
                      </p>
                    ) : null}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    수집 {log.records_collected ?? 0}건
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground">선택한 조건에 맞는 로그가 없습니다.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}