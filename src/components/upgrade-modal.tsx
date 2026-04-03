"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Zap, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UpgradeModalProps {
  /** 모달 표시 여부 */
  open: boolean;
  /** 닫기 콜백 */
  onClose: () => void;
  /** 제한에 걸린 기능 이름 (예: "즐겨찾기", "알림 규칙") */
  feature?: string;
  /** 현재 플랜 한도 (예: 50) */
  limit?: number;
}

export function UpgradeModal({ open, onClose, feature = "기능", limit }: UpgradeModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleUpgrade = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "pro" }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        router.push("/pricing");
      }
    } catch {
      router.push("/pricing");
    } finally {
      setLoading(false);
    }
  }, [router]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative bg-background border border-border rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="닫기"
        >
          <X className="w-4 h-4" />
        </button>

        {/* 아이콘 */}
        <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center">
          <Zap className="w-6 h-6 text-indigo-500" />
        </div>

        {/* 텍스트 */}
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">플랜 한도에 도달했습니다</h2>
          <p className="text-sm text-muted-foreground">
            현재 <strong>Free 플랜</strong>에서 {feature}
            {limit !== undefined ? `을(를) 최대 ${limit}개` : "을(를)"}까지 사용할 수 있습니다.
            <br />
            Pro 플랜으로 업그레이드하면 한도 제한 없이 사용할 수 있습니다.
          </p>
        </div>

        {/* 버튼 */}
        <div className="flex flex-col gap-2">
          <Button
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={handleUpgrade}
            disabled={loading}
          >
            {loading ? "처리 중..." : "Pro로 업그레이드하기 →"}
          </Button>
          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={() => { onClose(); router.push("/pricing"); }}
          >
            요금제 비교 보기
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * API 응답에서 PLAN_LIMIT 에러를 감지하고 모달 상태를 반환하는 훅
 *
 * 사용 예시:
 *   const { limitModalProps, checkPlanLimit } = usePlanLimit("즐겨찾기", 50);
 *   const result = await fetch("/api/favorites/...");
 *   if (!checkPlanLimit(result, await result.json())) return;
 */
export function usePlanLimit(feature?: string, limit?: number) {
  const [open, setOpen] = useState(false);

  function checkPlanLimit(ok: boolean, body: { code?: string }): boolean {
    if (!ok && body?.code === "PLAN_LIMIT") {
      setOpen(true);
      return false; // 제한 걸림
    }
    return true; // 계속 진행
  }

  const limitModalProps: UpgradeModalProps = {
    open,
    onClose: () => setOpen(false),
    feature,
    limit,
  };

  return { limitModalProps, checkPlanLimit, openModal: () => setOpen(true) };
}
