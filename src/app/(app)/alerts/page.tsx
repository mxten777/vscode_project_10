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
  CardDescription,
  CardHeader,
  CardTitle,
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
import { Bell, Plus, Trash2, Mail, MessageSquare } from "lucide-react";
import { toast } from "sonner";

export default function AlertsPage() {
  const { data: rules, isLoading: rulesLoading } = useAlertRules();
  const { data: logs, isLoading: logsLoading } = useAlertLogs();
  const createRule = useCreateAlertRule();
  const updateRule = useUpdateAlertRule();
  const deleteRule = useDeleteAlertRule();

  const [dialogOpen, setDialogOpen] = useState(false);

  // 새 규칙 폼
  const [ruleType, setRuleType] = useState<"KEYWORD" | "FILTER">("KEYWORD");
  const [keyword, setKeyword] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [channel, setChannel] = useState<"EMAIL" | "KAKAO">("EMAIL");

  const handleCreate = async () => {
    try {
      await createRule.mutateAsync({
        type: ruleType,
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
    } catch {
      toast.error("삭제 실패");
    }
  };

  const resetForm = () => {
    setRuleType("KEYWORD");
    setKeyword("");
    setBudgetMin("");
    setBudgetMax("");
    setChannel("EMAIL");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6" />
            알림 관리
          </h1>
          <p className="text-muted-foreground mt-1">
            키워드/필터 조건에 맞는 새 공고를 알림 받으세요
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-1" />
              규칙 추가
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>새 알림 규칙</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              {/* 유형 */}
              <div className="space-y-2">
                <Label>유형</Label>
                <Select
                  value={ruleType}
                  onValueChange={(v) => setRuleType(v as "KEYWORD" | "FILTER")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KEYWORD">키워드</SelectItem>
                    <SelectItem value="FILTER">필터</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 키워드 */}
              <div className="space-y-2">
                <Label>키워드</Label>
                <Input
                  placeholder="예: 소프트웨어, 정보화"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                />
              </div>

              {/* 예산 범위 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>최소 예산 (원)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={budgetMin}
                    onChange={(e) => setBudgetMin(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>최대 예산 (원)</Label>
                  <Input
                    type="number"
                    placeholder="무제한"
                    value={budgetMax}
                    onChange={(e) => setBudgetMax(e.target.value)}
                  />
                </div>
              </div>

              {/* 채널 */}
              <div className="space-y-2">
                <Label>알림 채널</Label>
                <Select
                  value={channel}
                  onValueChange={(v) => setChannel(v as "EMAIL" | "KAKAO")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EMAIL">이메일</SelectItem>
                    <SelectItem value="KAKAO">카카오톡 (준비중)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                className="w-full"
                onClick={handleCreate}
                disabled={createRule.isPending}
              >
                {createRule.isPending ? "생성 중..." : "규칙 생성"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="rules">알림 규칙</TabsTrigger>
          <TabsTrigger value="logs">발송 이력</TabsTrigger>
        </TabsList>

        {/* 규칙 목록 */}
        <TabsContent value="rules" className="space-y-3 mt-4">
          {rulesLoading && (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          )}

          {rules && rules.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Bell className="mx-auto h-8 w-8 mb-3 opacity-50" />
                <p>설정된 알림 규칙이 없습니다</p>
              </CardContent>
            </Card>
          )}

          {rules?.map((rule) => {
            const rj = rule.rule_json || {};
            return (
              <Card key={rule.id}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={rule.type === "KEYWORD" ? "default" : "secondary"}>
                          {rule.type === "KEYWORD" ? "키워드" : "필터"}
                        </Badge>
                        <Badge variant="outline" className="gap-1">
                          {rule.channel === "EMAIL" ? (
                            <Mail className="h-3 w-3" />
                          ) : (
                            <MessageSquare className="h-3 w-3" />
                          )}
                          {rule.channel}
                        </Badge>
                        {!rule.is_enabled && (
                          <Badge variant="secondary">비활성</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground space-y-0.5">
                        {rj.keyword && <p>키워드: {rj.keyword}</p>}
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
                        size="sm"
                        onClick={() => handleDelete(rule.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* 발송 이력 */}
        <TabsContent value="logs" className="space-y-3 mt-4">
          {logsLoading && (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          )}

          {logs && logs.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <p>발송 이력이 없습니다</p>
              </CardContent>
            </Card>
          )}

          {logs?.map((log) => (
            <Card key={log.id}>
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      {log.tender?.title || log.tender_id}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(log.sent_at).toLocaleString("ko-KR")}
                    </p>
                  </div>
                  <Badge
                    variant={log.status === "SENT" ? "default" : "destructive"}
                  >
                    {log.status === "SENT" ? "발송" : "실패"}
                  </Badge>
                </div>
                {log.error_message && (
                  <p className="text-xs text-destructive mt-1">
                    {log.error_message}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
