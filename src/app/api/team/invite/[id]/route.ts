/**
 * DELETE /api/team/invite/[id]
 * 초대 취소 (admin only)
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getAuthContext } from "@/lib/auth-context";
import { apiResponse } from "@/lib/api-response";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getAuthContext();
  if ("error" in ctx) return ctx.error;

  if (ctx.role !== "admin") {
    return apiResponse.error("관리자만 초대를 취소할 수 있습니다.", 403);
  }

  const { id } = await params;
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("org_invitations")
    .delete()
    .eq("id", id)
    .eq("org_id", ctx.orgId!);

  if (error) return apiResponse.error(error.message, 500);

  return new NextResponse(null, { status: 204 });
}
