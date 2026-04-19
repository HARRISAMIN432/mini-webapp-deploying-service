"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { OAUTH_PROVIDERS } from "@/config/oauth-providers";
import { OAuthProvider } from "@/lib/types/auth";
import { getOAuthStartUrl } from "@/lib/api";
import { cn } from "@/lib/utils";

interface OAuthButtonsProps {
  mode: "login" | "signup";
  className?: string;
}

export function OAuthButtons({ mode, className }: OAuthButtonsProps) {
  const [loadingProvider, setLoadingProvider] = useState<OAuthProvider | null>(
    null,
  );

  const handleOAuth = (providerId: OAuthProvider) => {
    setLoadingProvider(providerId);
    window.location.href = getOAuthStartUrl(providerId);
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {OAUTH_PROVIDERS.map((provider) => {
        const isLoading = loadingProvider === provider.id;
        const isDisabled = !!loadingProvider;

        return (
          <button
            key={provider.id}
            type="button"
            disabled={isDisabled}
            onClick={() => handleOAuth(provider.id)}
            className={cn(
              "group relative flex items-center justify-center gap-2.5 w-full h-11 rounded-xl text-sm font-medium",
              "transition-all duration-200 outline-none",
              "bg-[#0d0f14] border border-white/[0.08]",
              "hover:border-white/[0.18] hover:bg-[#111318]",
              "focus-visible:border-indigo-500/50 focus-visible:ring-2 focus-visible:ring-indigo-500/20",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-white/[0.08] disabled:hover:bg-[#0d0f14]",
              "text-[#d1d5db]",
            )}
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            {/* Subtle hover shimmer */}
            <div
              className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{
                background:
                  "linear-gradient(105deg, rgba(255,255,255,0.03) 0%, transparent 60%)",
              }}
            />

            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
            ) : (
              <svg
                viewBox={provider.viewBox}
                className="w-4 h-4 flex-shrink-0"
                fill="currentColor"
              >
                <path d={provider.iconPath} />
              </svg>
            )}
            <span className="relative">
              {mode === "login" ? "Continue" : "Sign up"} with {provider.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
