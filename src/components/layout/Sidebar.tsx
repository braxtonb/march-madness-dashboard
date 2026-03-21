"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { NAV_PAGES } from "@/lib/constants";

const ICONS: Record<string, string> = {
  trophy: "🏆",
  users: "👥",
  "heart-pulse": "💚",
  sliders: "🎛️",
  award: "🎖️",
  "bar-chart": "📊",
  "git-compare": "⚔️",
  star: "⭐",
};

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="fixed top-3 left-3 z-50 rounded-card bg-surface-bright p-2 md:hidden"
        aria-label="Toggle menu"
      >
        <span className="text-on-surface text-xl">☰</span>
      </button>

      <aside
        className={`
          fixed left-0 top-[52px] z-40 h-[calc(100vh-52px)] w-56
          bg-surface-container transition-transform duration-200
          ${collapsed ? "-translate-x-full" : "translate-x-0"}
          md:translate-x-0
        `}
      >
        <nav className="flex flex-col gap-1 p-3 pt-4">
          {NAV_PAGES.map((page) => {
            const active = pathname === page.path;
            return (
              <Link
                key={page.path}
                href={page.path}
                onClick={() => setCollapsed(true)}
                className={`
                  flex items-center gap-3 rounded-card px-3 py-2.5 text-sm transition-colors
                  ${
                    active
                      ? "bg-surface-bright text-primary glow-primary"
                      : "text-on-surface-variant hover:bg-surface-bright hover:text-on-surface"
                  }
                `}
              >
                <span className="text-base">{ICONS[page.icon] || "•"}</span>
                <span className="font-body">{page.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
