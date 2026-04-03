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
  if (!res.ok) throw new Error("멤버 조회 실패");
  return res.json();
}

async function fetchInvitations(): Promise<{ invitations: Invitation[] }> {
  const res = await fetch("/api/team/invite");
  if (!res.ok) throw new Error("초대 목록 조회 실패");
  return res.json();
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

  const { data: invitesData } = useQuery({
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">팀 관리</h1>
        <p className="text-muted-foreground mt-1">조직 멤버를 초대하고 관리하세요.</p>
      </div>

      {/* 멤버 초대 */}
      <Card>
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
          {inviteMutation.isSuccess && (
            <p className="text-sm text-green-600 mt-2">초대 이메일을 발송했습니다.</p>
          )}
        </CardContent>
      </Card>

      {/* 현재 멤버 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            현재 멤버 ({members.length}명)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">멤버가 없습니다.</p>
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

      {/* 대기 중인 초대 */}
      {invitations.length > 0 && (
        <Card>
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
