"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

type State = "loading" | "login_required" | "processing" | "success" | "error";

export default function AcceptInvitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [state, setState] = useState<State>("loading");
  const [message, setMessage] = useState("");


  async function acceptInvite(tok: string) {
    setState("processing");
    const res = await fetch("/api/team/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: tok }),
    });
    const data = await res.json();
    if (res.ok) {
      setState("success");
      setMessage(data.message ?? "팀에 합류했습니다.");
      setTimeout(() => router.push("/"), 2000);
    } else {
      setState("error");
      setMessage(data.message ?? "초대 수락에 실패했습니다.");
    }
  }

  useEffect(() => {
    if (!token) {
      setState("error");
      setMessage("초대 링크가 올바르지 않습니다.");
      return;
    }

    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        setState("login_required");
      } else {
        acceptInvite(token);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function goLogin() {
    router.push(`/login?redirect=/invite/accept?token=${token}`);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>팀 초대</CardTitle>
          <CardDescription>Smart Bid Radar 팀에 합류하세요</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 py-6">
          {state === "loading" || state === "processing" ? (
            <>
              <Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />
              <p className="text-muted-foreground">
                {state === "loading" ? "초대 링크를 확인하는 중..." : "초대를 수락하는 중..."}
              </p>
            </>
          ) : state === "login_required" ? (
            <>
              <p className="text-center text-muted-foreground">
                초대를 수락하려면 먼저 로그인하세요.
              </p>
              <Button onClick={goLogin} className="w-full">
                로그인하기
              </Button>
            </>
          ) : state === "success" ? (
            <>
              <CheckCircle2 className="h-10 w-10 text-green-500" />
              <p className="text-center font-medium">{message}</p>
              <p className="text-sm text-muted-foreground">잠시 후 대시보드로 이동합니다...</p>
            </>
          ) : (
            <>
              <XCircle className="h-10 w-10 text-red-500" />
              <p className="text-center text-destructive">{message}</p>
              <Button variant="outline" onClick={() => router.push("/")}>
                홈으로 돌아가기
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
