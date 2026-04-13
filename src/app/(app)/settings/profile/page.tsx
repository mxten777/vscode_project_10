"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export default function ProfileSettingsPage() {
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? "");
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error("비밀번호는 8자 이상이어야 합니다");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("비밀번호가 일치하지 않습니다");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("비밀번호가 변경되었습니다");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      toast.error("비밀번호 변경 중 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 계정 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">계정 정보</CardTitle>
          <CardDescription>로그인에 사용하는 이메일 주소입니다</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            <Label>이메일</Label>
            <Input value={email} readOnly className="bg-muted/50 cursor-default" />
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* 비밀번호 변경 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">비밀번호 변경</CardTitle>
          <CardDescription>새 비밀번호는 8자 이상이어야 합니다</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="new-password">새 비밀번호</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="새 비밀번호 입력"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowNew(!showNew)}
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm-password">비밀번호 확인</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="새 비밀번호 재입력"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowConfirm(!showConfirm)}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || !newPassword || !confirmPassword}
              className="btn-premium text-white"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              비밀번호 변경
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
