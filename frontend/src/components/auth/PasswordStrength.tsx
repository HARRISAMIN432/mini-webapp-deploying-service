"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface PasswordStrengthProps {
  password: string;
}

interface StrengthResult {
  score: number; // 0–4
  label: string;
  color: string;
  textColor: string;
  bars: ("filled" | "empty")[];
}

function evaluateStrength(password: string): StrengthResult {
  if (!password) {
    return {
      score: 0,
      label: "",
      color: "",
      textColor: "",
      bars: ["empty", "empty", "empty", "empty"],
    };
  }

  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const configs: Record<number, Omit<StrengthResult, "score" | "bars">> = {
    1: { label: "Weak", color: "#ef4444", textColor: "#f87171" },
    2: { label: "Fair", color: "#f59e0b", textColor: "#fbbf24" },
    3: { label: "Good", color: "#eab308", textColor: "#facc15" },
    4: { label: "Strong", color: "#22c55e", textColor: "#4ade80" },
  };

  const { label, color, textColor } = configs[score] ?? configs[1];
  const bars = Array.from({ length: 4 }, (_, i) =>
    i < score ? "filled" : "empty",
  ) as StrengthResult["bars"];

  return { score, label, color, textColor, bars };
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const strength = useMemo(() => evaluateStrength(password), [password]);

  if (!password) return null;

  return (
    <div className="mt-2.5 space-y-2">
      <div className="flex items-center gap-1.5">
        {strength.bars.map((bar, i) => (
          <div
            key={i}
            className="h-[3px] flex-1 rounded-full transition-all duration-500"
            style={{
              background:
                bar === "filled" ? strength.color : "rgba(255,255,255,0.07)",
              boxShadow:
                bar === "filled" ? `0 0 6px ${strength.color}60` : "none",
            }}
          />
        ))}
        <span
          className="text-[11px] font-medium ml-1 min-w-[40px] text-right transition-colors duration-300"
          style={{
            color: strength.textColor,
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {strength.label}
        </span>
      </div>
    </div>
  );
}
