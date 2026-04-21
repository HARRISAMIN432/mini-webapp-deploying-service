"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/projects", label: "Projects" },
  { href: "/dashboard/deployments", label: "Deployments" },
  { href: "/dashboard/logs", label: "Logs" },
  { href: "/dashboard/domains", label: "Domains" },
];

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-72 border-r border-white/10 bg-[#0a0f19]/95 p-6 backdrop-blur-xl">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-indigo-300/80">
          ShipStack
        </p>
        <h1
          className="mt-2 text-2xl font-bold text-white"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          Dashboard
        </h1>
      </div>

      <nav className="space-y-2">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                active
                  ? "bg-indigo-500/20 text-indigo-200 ring-1 ring-indigo-400/35"
                  : "text-slate-300 hover:bg-white/5 hover:text-white"
              }`}
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
