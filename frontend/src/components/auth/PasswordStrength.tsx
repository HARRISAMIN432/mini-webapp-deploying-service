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
  bars: ("filled" | "empty")[];
}

function evaluateStrength(password: string): StrengthResult {
  if (!password) {
    return {
      score: 0,
      label: "",
      color: "",
      bars: ["empty", "empty", "empty", "empty"],
    };
  }

  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const configs: Record<number, Omit<StrengthResult, "score" | "bars">> = {
    1: { label: "Weak", color: "bg-red-500" },
    2: { label: "Fair", color: "bg-amber-500" },
    3: { label: "Good", color: "bg-yellow-400" },
    4: { label: "Strong", color: "bg-green-500" },
  };

  const { label, color } = configs[score] ?? configs[1];
  const bars = Array.from({ length: 4 }, (_, i) =>
    i < score ? "filled" : "empty",
  ) as StrengthResult["bars"];

  return { score, label, color, bars };
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const strength = useMemo(() => evaluateStrength(password), [password]);

  if (!password) return null;

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {strength.bars.map((bar, i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-all duration-300",
              bar === "filled" ? strength.color : "bg-white/10",
            )}
          />
        ))}
      </div>
      <p
        className={cn("text-xs font-medium transition-colors", {
          "text-red-400": strength.score === 1,
          "text-amber-400": strength.score === 2,
          "text-yellow-300": strength.score === 3,
          "text-green-400": strength.score === 4,
        })}
      >
        {strength.label} password
      </p>
    </div>
  );
}
