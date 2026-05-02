// components/auth/AuthLayoutClient.tsx
"use client";

import { ReactNode } from "react";
import Link from "next/link";

interface AuthLayoutClientProps {
  children: ReactNode;
}

export function AuthLayoutClient({ children }: AuthLayoutClientProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col bg-gray-900 overflow-hidden">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-900 to-violet-950" />

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />

        <div className="relative z-10 flex flex-col h-full p-12 xl:p-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group w-fit">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
                <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
              </svg>
            </div>
            <span className="text-white font-semibold text-lg tracking-tight">
              ShipStack
            </span>
          </Link>

          {/* Hero content */}
          <div className="flex-1 flex flex-col justify-center max-w-md">
            <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-4">
              Deploy with
              <br />
              <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
                confidence
              </span>
            </h1>

            {/* Feature list */}
            <div className="mt-10 space-y-4">
              {[
                { label: "Auto-detection", desc: "Framework-aware builds" },
                { label: "Instant rollbacks", desc: "One-click revert" },
              ].map((feature) => (
                <div key={feature.label} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-3 h-3 text-violet-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-200">
                      {feature.label}
                    </p>
                    <p className="text-xs text-gray-500">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-8 pt-8 border-t border-gray-800">
            {[
              { value: "99.99%", label: "Uptime" },
              { value: "<30s", label: "Deploy time" },
              { value: "10k+", label: "Developers" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-lg font-bold text-white">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 lg:p-16">
        <div className="w-full max-w-[400px]">{children}</div>
      </div>
    </div>
  );
}
