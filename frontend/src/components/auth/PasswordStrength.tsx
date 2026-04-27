// components/auth/PasswordStrength.tsx
"use client";

import { useMemo } from "react";

interface PasswordStrengthProps {
  password: string;
}

interface StrengthResult {
  score: number;
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

  const configs: Record<number, { label: string; color: string }> = {
    1: { label: "Weak", color: "#ef4444" },
    2: { label: "Fair", color: "#f59e0b" },
    3: { label: "Good", color: "#eab308" },
    4: { label: "Strong", color: "#22c55e" },
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
    <div className="mt-2 flex items-center gap-1.5">
      {strength.bars.map((bar, i) => (
        <div
          key={i}
          className="h-1 flex-1 rounded-full transition-all duration-300"
          style={{
            backgroundColor: bar === "filled" ? strength.color : "#e5e7eb",
          }}
        />
      ))}
      <span
        className="text-xs font-medium ml-1 min-w-[40px]"
        style={{ color: strength.color }}
      >
        {strength.label}
      </span>
    </div>
  );
}
