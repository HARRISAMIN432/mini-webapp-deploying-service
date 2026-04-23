"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/dashboard", label: "Dashboard", exact: true },
  { href: "/dashboard/projects", label: "Projects", exact: false },
  { href: "/dashboard/deployments", label: "Deployments", exact: false },
  { href: "/dashboard/domains", label: "Domains", exact: false },
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

      <nav className="space-y-1">
        {items.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                active
                  ? "bg-indigo-500/20 text-indigo-200 ring-1 ring-indigo-400/35"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              <span className="text-base leading-none">
                {item.href === "/dashboard" && "⬡"}
                {item.href === "/dashboard/projects" && "◫"}
                {item.href === "/dashboard/deployments" && "▶"}
                {item.href === "/dashboard/domains" && "◎"}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
