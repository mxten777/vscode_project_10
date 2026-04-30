import { redirect } from "next/navigation";
import { AdminOperationsConsole } from "@/components/admin-operations-console";
import { getAuthContext } from "@/lib/auth-context";
import { canAccessOperationsConsole } from "@/lib/operations-access";

export default async function SettingsOperationsPage() {
  const ctx = await getAuthContext();

  if ("error" in ctx) {
    redirect("/login");
  }

  if (!canAccessOperationsConsole(ctx)) {
    redirect("/settings");
  }

  return <AdminOperationsConsole />;
}