"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  {
    section: "OVERVIEW",
    items: [
      {
        href: "/dashboard",
        label: "Dashboard",
        exact: true,
        icon: (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect
              x="1"
              y="1"
              width="6"
              height="6"
              rx="1.5"
              fill="currentColor"
              opacity="0.9"
            />
            <rect
              x="9"
              y="1"
              width="6"
              height="6"
              rx="1.5"
              fill="currentColor"
              opacity="0.5"
            />
            <rect
              x="1"
              y="9"
              width="6"
              height="6"
              rx="1.5"
              fill="currentColor"
              opacity="0.5"
            />
            <rect
              x="9"
              y="9"
              width="6"
              height="6"
              rx="1.5"
              fill="currentColor"
              opacity="0.3"
            />
          </svg>
        ),
      },
      {
        href: "/dashboard/projects",
        label: "Projects",
        exact: false,
        icon: (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect
              x="1"
              y="1"
              width="6.5"
              height="6.5"
              rx="1.5"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <rect
              x="8.5"
              y="1"
              width="6.5"
              height="6.5"
              rx="1.5"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <rect
              x="1"
              y="8.5"
              width="6.5"
              height="6.5"
              rx="1.5"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <rect
              x="8.5"
              y="8.5"
              width="6.5"
              height="6.5"
              rx="1.5"
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </svg>
        ),
      },
      {
        href: "/dashboard/deployments",
        label: "Deployments",
        exact: false,
        icon: (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle
              cx="8"
              cy="8"
              r="6.5"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path d="M6 5.5L11 8L6 10.5V5.5Z" fill="currentColor" />
          </svg>
        ),
      },
    ],
  },
  {
    section: "CONFIG",
    items: [
      {
        href: "/dashboard/settings",
        label: "Settings",
        exact: false,
        icon: (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M8 10C9.10457 10 10 9.10457 10 8C10 6.89543 9.10457 6 8 6C6.89543 6 6 6.89543 6 8C6 9.10457 6.89543 10 8 10Z"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M13 8C13 8 12.5 6.5 11.5 5.8L12 3.5L10 2.5L8.5 4C8.17 3.97 7.83 3.97 7.5 4L6 2.5L4 3.5L4.5 5.8C3.5 6.5 3 8 3 8C3 8 3.5 9.5 4.5 10.2L4 12.5L6 13.5L7.5 12C7.83 12.03 8.17 12.03 8.5 12L10 13.5L12 12.5L11.5 10.2C12.5 9.5 13 8 13 8Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
        ),
      },
    ],
  },
];

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 border-r border-gray-200 bg-white flex flex-col">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M8 2L13.5 5V11L8 14L2.5 11V5L8 2Z"
                stroke="white"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path
                d="M8 6L10.5 7.5V10.5L8 12L5.5 10.5V7.5L8 6Z"
                fill="white"
                opacity="0.7"
              />
            </svg>
          </div>
          <span className="font-semibold text-gray-900 text-[15px] tracking-tight">
            ShipStack
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {navItems.map((group) => (
          <div key={group.section} className="mb-5">
            <p className="px-3 mb-1.5 text-[10px] font-semibold tracking-widest text-gray-400 uppercase">
              {group.section}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = item.exact
                  ? pathname === item.href
                  : pathname === item.href ||
                    pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                      active
                        ? "bg-violet-50 text-violet-700"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <span
                      className={active ? "text-violet-600" : "text-gray-400"}
                    >
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="px-4 py-4 border-t border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-semibold">U</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-800 truncate">
              My Workspace
            </p>
            <p className="text-[10px] text-gray-400 truncate">Free plan</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
