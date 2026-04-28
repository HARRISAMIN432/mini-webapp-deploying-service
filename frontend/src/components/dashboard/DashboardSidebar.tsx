"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useGithubStatus } from "@/lib/hooks/useGithubStatus";

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
            <rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.9" />
            <rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.5" />
            <rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.5" />
            <rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.3" />
          </svg>
        ),
      },
      {
        href: "/dashboard/projects",
        label: "Projects",
        exact: false,
        icon: (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="1" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
            <rect x="8.5" y="1" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
            <rect x="1" y="8.5" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
            <rect x="8.5" y="8.5" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        ),
      },
      {
        href: "/dashboard/deployments",
        label: "Deployments",
        exact: false,
        icon: (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" />
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
  const { status: githubStatus } = useGithubStatus();

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
              <path d="M8 6L10.5 7.5V10.5L8 12L5.5 10.5V7.5L8 6Z" fill="white" opacity="0.7" />
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
                  : pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${active
                      ? "bg-violet-50 text-violet-700"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                  >
                    <span className={active ? "text-violet-600" : "text-gray-400"}>
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        {/* GitHub Connect CTA in sidebar (if not connected) */}
        {githubStatus && !githubStatus.connected && (
          <div className="mt-2 mx-1">
            <Link
              href="/dashboard/settings"
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-gray-200 text-xs text-gray-500 hover:border-gray-300 hover:text-gray-700 transition-colors"
            >
              <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
              </svg>
              Connect GitHub
            </Link>
          </div>
        )}
      </nav>

      {/* User footer */}
      <div className="px-4 py-4 border-t border-gray-100 space-y-2.5">
        {/* GitHub badge */}
        {githubStatus?.connected && (
          <div className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 rounded-lg">
            {githubStatus.avatarUrl ? (
              <img
                src={githubStatus.avatarUrl}
                alt={githubStatus.githubLogin}
                className="w-4 h-4 rounded-full flex-shrink-0"
              />
            ) : (
              <svg className="w-4 h-4 flex-shrink-0 text-gray-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
              </svg>
            )}
            <span className="text-[11px] text-gray-600 truncate font-medium">
              {githubStatus.githubLogin}
            </span>
            <span className="ml-auto w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" title="GitHub connected" />
          </div>
        )}

        {/* Workspace */}
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-semibold">U</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-800 truncate">My Workspace</p>
            <p className="text-[10px] text-gray-400 truncate">Free plan</p>
          </div>
        </div>
      </div>
    </aside>
  );
}