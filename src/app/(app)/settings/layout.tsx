"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, User, CreditCard, Building } from "lucide-react";
import { cn } from "@/lib/utils";

const sidebarItems = [
  { href: "/settings", label: "개요", icon: LayoutGrid },
  { href: "/settings/profile", label: "프로필", icon: User },
  { href: "/settings/company", label: "회사 정보", icon: Building },
  { href: "/settings/billing", label: "요금제 & 결제", icon: CreditCard },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">설정</h1>
        <p className="text-muted-foreground text-sm mt-1">계정 및 결제 정보를 관리합니다</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-8">
        {/* Sidebar */}
        <aside className="sm:w-48 shrink-0">
          <nav className="flex sm:flex-col gap-1">
            {sidebarItems.map((item) => {
              const active = item.href === "/settings"
                ? pathname === "/settings"
                : pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
