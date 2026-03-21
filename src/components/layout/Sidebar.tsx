"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { NAV_PAGES } from "@/lib/constants";

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-3 left-3 z-50 rounded-card bg-surface-bright p-2 md:hidden"
        aria-label="Toggle menu"
      >
        <span className="text-on-surface text-xl">☰</span>
      </button>

      <aside
        className={`
          fixed left-0 top-[52px] z-40 h-[calc(100vh-52px)]
          bg-surface-container transition-all duration-300
          w-16 hover:w-56 overflow-hidden
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
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
                onClick={() => setMobileOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 text-sm transition-all duration-200
                  ${
                    active
                      ? "bg-gradient-to-r from-primary/20 to-transparent border-l-4 border-primary text-primary"
                      : "text-on-surface-variant hover:bg-surface-bright hover:text-on-surface border-l-4 border-transparent"
                  }
                `}
              >
                <span className="shrink-0 font-label text-xs font-bold uppercase tracking-widest min-w-[1.5rem] text-center">
                  {page.label.slice(0, 2).toUpperCase()}
                </span>
                <span className="font-body whitespace-nowrap overflow-hidden">{page.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
