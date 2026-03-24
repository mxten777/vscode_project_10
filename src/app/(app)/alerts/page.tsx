"use client";

import { useState } from "react";
import {
  useAlertRules,
  useAlertLogs,
  useCreateAlertRule,
  useUpdateAlertRule,
  useDeleteAlertRule,
} from "@/hooks/use-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Bell, Plus, Trash2, Mail, MessageSquare, BellRing, Send, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function AlertsPage() {
  const { data: rules, isLoading: rulesLoading } = useAlertRules();
  const { data: logs, isLoading: logsLoading } = useAlertLogs();
  const createRule = useCreateAlertRule();
  const updateRule = useUpdateAlertRule();
  const deleteRule = useDeleteAlertRule();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const [ruleType, setRuleType] = useState<"KEYWORD" | "FILTER">("KEYWORD");
  const [ruleName, setRuleName] = useState("");
  const [keyword, setKeyword] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [channel, setChannel] = useState<"EMAIL" | "KAKAO">("EMAIL");

  const handleCreate = async () => {
    if (!keyword.trim() && ruleType === "KEYWORD") {
      toast.error("키워드를 입력해주세요");
      return;
    }
    try {
      await createRule.mutateAsync({
        type: ruleType,
        name: ruleName.trim() || undefined,
        rule_json: {
          keyword: keyword || undefined,
          budgetMin: budgetMin ? Number(budgetMin) : undefined,
          budgetMax: budgetMax ? Number(budgetMax) : undefined,
        },
        channel,
        is_enabled: true,
      });
      toast.success("알림 규칙 생성 완료");
      setDialogOpen(false);
      resetForm();
    } catch {
      toast.error("알림 규칙 생성 실패");
    }
  };

  const handleToggle = async (id: string, isEnabled: boolean) => {
    try {
      await updateRule.mutateAsync({ id, is_enabled: !isEnabled });
      toast.success(isEnabled ? "비활성화" : "활성화");
    } catch {
      toast.error("변경 실패");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRule.mutateAsync(id);
      toast.success("규칙 삭제 완료");
      setDeleteTargetId(null);
    } catch {
      toast.error("삭제 실패");
    }
  };

  const resetForm = () => {
    setRuleType("KEYWORD");
    setRuleName("");
    setKeyword("");
    setBudgetMin("");
    setBudgetMax("");
    setChannel("EMAIL");
  };

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-rose-950 via-indigo-950 to-indigo-900 px-8 py-8 sm:px-10">
        <div className="noise-overlay" />
        <div className="absolute top-[-10%] right-[-5%] h-55 w-55 rounded-full bg-rose-500/20 blur-[80px] animate-mesh pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[10%] h-45 w-45 rounded-full bg-indigo-500/20 blur-[70px] animate-mesh pointer-events-none" style={{ animationDelay: "-5s" }} />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-3 py-1 text-xs font-semibold text-white/80 mb-3">
              <Bell className="h-3 w-3 text-rose-300" />
              매치 알림 시스템
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">알림 관리</h1>
            <p className="text-white/50 mt-1">키워드/필터 조건에 맞는 새 공고를 알림 받으세요</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-1.5 rounded-xl px-5 h-10 bg-white text-indigo-900 hover:bg-white/90 font-semibold shadow-lg">
                <Plus className="h-4 w-4" />
                규칙 추가
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>새 알림 규칙</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">규칙 이름 (선택)</Label>
                  <Input
                    placeholder="예: AI 공공사업 알림"
                    value={ruleName}
                    onChange={(e) => setRuleName(e.target.value)}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">유형</Label>
                  <Select
                    value={ruleType}
                    onValueChange={(v) => setRuleType(v as "KEYWORD" | "FILTER")}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="KEYWORD">키워드</SelectItem>
                      <SelectItem value="FILTER">필터</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">키워드</Label>
                  <Input
                    placeholder="예: AI 시스템 소프트웨어 (띄어쓰기로 구분, OR 조건)"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    className="h-11"
                  />
                  <p className="text-xs text-muted-foreground">여러 키워드는 띄어쓰기로 구분 — 하나라도 포함되면 알림 발송</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">최소 예산 (원)</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={budgetMin}
                      onChange={(e) => setBudgetMin(e.target.value)}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">최대 예산 (원)</Label>
                    <Input
                      type="number"
                      placeholder="무제한"
                      value={budgetMax}
                      onChange={(e) => setBudgetMax(e.target.value)}
                      className="h-11"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">알림 채널</Label>
                  <Select
                    value={channel}
                    onValueChange={(v) => setChannel(v as "EMAIL" | "KAKAO")}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EMAIL">이메일</SelectItem>
                      <SelectItem value="KAKAO" disabled>
                        카카오톡 (준비중)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  className="w-full h-11 text-base font-semibold btn-premium text-white rounded-xl"
                  onClick={handleCreate}
                  disabled={createRule.isPending}
                >
                  {createRule.isPending ? "생성 중..." : "규칙 생성"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="rules">
        <TabsList className="grid w-full max-w-xs grid-cols-2">
          <TabsTrigger value="rules" className="gap-1.5">
            <BellRing className="h-3.5 w-3.5" />
            알림 규칙
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-1.5">
            <Send className="h-3.5 w-3.5" />
            발송 이력
          </TabsTrigger>
        </TabsList>

        {/* Rules Tab */}
        <TabsContent value="rules" className="space-y-3 mt-6">
          {rulesLoading && (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          )}

          {rules && rules.length === 0 && (
            <Card className="premium-card">
              <CardContent className="py-20 text-center text-muted-foreground">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-primary/10 to-primary/5 mx-auto mb-5">
                  <Bell className="h-7 w-7 text-primary/50" />
                </div>
                <p className="text-lg font-semibold text-foreground">알림 규칙이 없습니다</p>
                <p className="text-sm mt-1.5">새 규칙을 추가하여 맞춤 알림을 받아보세요</p>
              </CardContent>
            </Card>
          )}

          {rules && rules.length > 0 && (
            <div className="stagger-children space-y-3">
              {rules.map((rule) => {
                const rj = rule.rule_json || {};
                return (
                  <Card key={rule.id} className={`premium-card card-hover ${!rule.is_enabled ? "opacity-60" : ""}`}>
                    <CardContent className="py-5">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1.5">
                            {rule.name && (
                              <span className="text-sm font-semibold text-foreground">{rule.name}</span>
                            )}
                            <Badge variant={rule.type === "KEYWORD" ? "default" : "secondary"}>
                              {rule.type === "KEYWORD" ? "키워드" : "필터"}
                            </Badge>
                            <Badge variant="outline" className="gap-1 bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400">
                              {rule.channel === "EMAIL" ? (
                                <Mail className="h-3 w-3" />
                              ) : (
                                <MessageSquare className="h-3 w-3" />
                              )}
                              {rule.channel}
                            </Badge>
                            {!rule.is_enabled && (
                              <Badge variant="secondary" className="text-xs">비활성</Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground space-y-0.5 mt-1">
                            {rj.keyword && <p>키워드: <span className="font-medium text-foreground">{rj.keyword}</span></p>}
                            {(rj.budgetMin || rj.budgetMax) && (
                              <p>
                                예산:{" "}
                                {rj.budgetMin
                                  ? `${Number(rj.budgetMin).toLocaleString()}원`
                                  : "0원"}
                                {" ~ "}
                                {rj.budgetMax
                                  ? `${Number(rj.budgetMax).toLocaleString()}원`
                                  : "무제한"}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={rule.is_enabled}
                            onCheckedChange={() =>
                              handleToggle(rule.id, rule.is_enabled)
                            }
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full hover:bg-destructive/10"
                            onClick={() => setDeleteTargetId(rule.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-3 mt-6">
          {logsLoading && (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          )}

          {logs && logs.length === 0 && (
            <Card className="premium-card">
              <CardContent className="py-20 text-center text-muted-foreground">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-primary/10 to-primary/5 mx-auto mb-5">
                  <Send className="h-7 w-7 text-primary/50" />
                </div>
                <p className="text-lg font-semibold text-foreground">발송 이력이 없습니다</p>
              </CardContent>
            </Card>
          )}

          {logs && logs.length > 0 && (
            <div className="stagger-children space-y-3">
              {logs.map((log) => (
                <Card key={log.id} className="premium-card card-hover">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {log.tender?.title || log.tender_id}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(log.sent_at).toLocaleString("ko-KR")}
                        </p>
                      </div>
                      <Badge
                        variant={log.status === "SENT" ? "default" : "destructive"}
                        className="shrink-0"
                      >
                        {log.status === "SENT" ? "발송" : "실패"}
                      </Badge>
                    </div>
                    {log.error_message && (
                      <div className="mt-2 flex items-start gap-1.5 text-xs text-destructive bg-destructive/5 rounded-lg p-2">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        {log.error_message}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={!!deleteTargetId} onOpenChange={(o) => !o && setDeleteTargetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>알림 규칙을 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              삭제된 규칙은 복구할 수 없습니다. 발송 이력은 유지됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => deleteTargetId && handleDelete(deleteTargetId)}
              disabled={deleteRule.isPending}
            >
              {deleteRule.isPending ? "삭제 중..." : "삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
