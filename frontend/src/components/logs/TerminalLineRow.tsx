import type { LogLevel, LogLine } from "@/lib/hooks/usedeploymentlogs";

// ── Color map ────────────────────────────────────────────────────────────────
const LEVEL_STYLES: Record<
  LogLevel,
  { color: string; prefix: string; glow?: string }
> = {
  success: { color: "#4ade80", prefix: "✓", glow: "rgba(74,222,128,0.15)" },
  error: { color: "#f87171", prefix: "✗", glow: "rgba(248,113,113,0.15)" },
  warn: { color: "#fbbf24", prefix: "⚠", glow: "rgba(251,191,36,0.12)" },
  info: { color: "#60a5fa", prefix: "→", glow: undefined },
  cmd: { color: "#e5e7eb", prefix: "$", glow: undefined },
  system: { color: "#6366f1", prefix: "•", glow: "rgba(99,102,241,0.12)" },
};

interface TerminalLineProps {
  line: LogLine;
  /** Whether this line just appeared (drives entrance animation) */
  isNew?: boolean;
}

export function TerminalLineRow({ line, isNew = false }: TerminalLineProps) {
  const style = LEVEL_STYLES[line.level];

  return (
    <div
      className="flex items-baseline gap-3 rounded-md px-2 py-[2px] group"
      style={{
        background: isNew && style.glow ? style.glow : "transparent",
        animation: isNew ? "log-enter 0.25s ease-out forwards" : undefined,
        fontFamily: "'DM Mono', 'Fira Code', monospace",
        fontSize: "12.5px",
        lineHeight: 1.75,
      }}
    >
      {/* Timestamp */}
      <span
        className="shrink-0 select-none tabular-nums"
        style={{ color: "#374151", fontSize: "11px" }}
      >
        {line.timestamp.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })}
      </span>

      {/* Project badge */}
      <span
        className="shrink-0 rounded px-1.5 py-px text-[10px] font-semibold uppercase tracking-wider"
        style={{
          background: "rgba(99,102,241,0.15)",
          color: "#818cf8",
          fontFamily: "'DM Sans', sans-serif",
          letterSpacing: "0.08em",
        }}
      >
        {line.projectName.length > 14
          ? line.projectName.slice(0, 14) + "…"
          : line.projectName}
      </span>

      {/* Level prefix */}
      <span
        className="shrink-0 w-3 text-center select-none"
        style={{ color: style.color }}
      >
        {style.prefix}
      </span>

      {/* Log text */}
      <span
        style={{ color: style.color === "#e5e7eb" ? "#cbd5e1" : style.color }}
      >
        {line.text}
      </span>
    </div>
  );
}
