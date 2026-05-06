import { getAuthContext } from "@/lib/auth-context";
import { canAccessOperationsConsole } from "@/lib/operations-access";
import { SettingsLayoutClient } from "./_components/settings-layout-client";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAuthContext();
  const showOperations = !("error" in ctx) && canAccessOperationsConsole(ctx);
  return (
    <SettingsLayoutClient showOperations={showOperations}>
      {children}
    </SettingsLayoutClient>
  );
}
