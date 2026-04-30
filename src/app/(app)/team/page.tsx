"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Mail, UserPlus, Trash2, Users, Clock, Loader2 } from "lucide-react";

interface Member {
  user_id: string;
  email: string;
  role: string;
  created_at: string;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  expires_at: string;
  created_at: string;
}

async function fetchMembers(): Promise<{ members: Member[] }> {
  const res = await fetch("/api/team/members");
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message ?? "멤버 조회 실패");
  return data;
}

async function fetchInvitations(): Promise<{ invitations: Invitation[] }> {
  const res = await fetch("/api/team/invite");
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message ?? "초대 목록 조회 실패");
  return data;
}

export default function TeamPage() {
  const qc = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member");
  const [inviteError, setInviteError] = useState("");

  const { data: membersData } = useQuery({
    queryKey: ["team-members"],
    queryFn: fetchMembers,
  });

  const { data: invitesData, error: invitesError } = useQuery({
    queryKey: ["team-invitations"],
    queryFn: fetchInvitations,
  });

  const inviteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "초대 실패");
      return data;
    },
    onSuccess: () => {
      setInviteEmail("");
      setInviteError("");
      qc.invalidateQueries({ queryKey: ["team-invitations"] });
    },
    onError: (err: Error) => {
      setInviteError(err.message);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/team/invite/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("초대 취소 실패");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team-invitations"] });
    },
  });

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    inviteMutation.mutate();
  };

  const members = membersData?.members ?? [];
  const invitations = invitesData?.invitations ?? [];

  return (
    <div className="space-y-6 animate-fade-up">
      <Card className="premium-card overflow-hidden border-primary/15 bg-primary/4">
        <CardContent className="px-6 py-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">팀 관리</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                같은 기준으로 공고를 검토할 수 있도록 팀원을 초대하고, 누가 함께 보고 있는지 정리하는 화면입니다.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:w-md">
              <div className="rounded-2xl border border-border/50 bg-background/80 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">현재 멤버</p>
                <p className="mt-1 text-sm font-semibold">{members.length}명</p>
                <p className="mt-1 text-xs text-muted-foreground">검토와 공유에 참여 중인 인원 수입니다.</p>
              </div>
              <div className="rounded-2xl border border-border/50 bg-background/80 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">대기 중 초대</p>
                <p className="mt-1 text-sm font-semibold">{invitations.length}건</p>
                <p className="mt-1 text-xs text-muted-foreground">아직 수락되지 않은 초대 링크 수입니다.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 멤버 초대 */}
      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserPlus className="h-4 w-4" />
            새 멤버 초대
          </CardTitle>
          <CardDescription>이메일 주소로 팀원을 초대합니다. 초대 링크는 48시간 유효합니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInvite} className="flex gap-2">
            <Input
              type="email"
              placeholder="team@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="flex-1"
              required
            />
            <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as "member" | "admin")}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">멤버</SelectItem>
                <SelectItem value="admin">관리자</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit" disabled={inviteMutation.isPending}>
              {inviteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "초대 발송"
              )}
            </Button>
          </form>
          {inviteError && (
            <p className="text-sm text-destructive mt-2">{inviteError}</p>
          )}
          {!inviteError && invitesError && (
            <p className="text-sm text-muted-foreground mt-2">{invitesError.message}</p>
          )}
          {inviteMutation.isSuccess && (
            <p className="text-sm text-green-600 mt-2">초대 이메일을 발송했습니다.</p>
          )}
        </CardContent>
      </Card>

      {/* 현재 멤버 */}
      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            현재 멤버 ({members.length}명)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">아직 함께 검토 중인 멤버가 없습니다. 먼저 한 명을 초대해 보세요.</p>
          ) : (
            <div className="space-y-2">
              {members.map((m) => (
                <div key={m.user_id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-xs font-medium text-indigo-700 dark:text-indigo-300">
                      {m.email.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm">{m.email}</span>
                  </div>
                  <Badge variant={m.role === "admin" ? "default" : "secondary"}>
                    {m.role === "admin" ? "관리자" : "멤버"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {invitesError && (
        <Card className="premium-card border-border/50 bg-muted/20">
          <CardContent className="py-6 text-sm text-muted-foreground">
            대기 중인 초대 목록은 관리자만 볼 수 있습니다.
          </CardContent>
        </Card>
      )}

      {/* 대기 중인 초대 */}
      {!invitesError && invitations.length > 0 && (
        <Card className="premium-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4" />
              대기 중인 초대 ({invitations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {invitations.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm">{inv.email}</p>
                      <p className="text-xs text-muted-foreground">
                        만료: {new Date(inv.expires_at).toLocaleString("ko-KR")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {inv.role === "admin" ? "관리자" : "멤버"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => cancelMutation.mutate(inv.id)}
                      disabled={cancelMutation.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
