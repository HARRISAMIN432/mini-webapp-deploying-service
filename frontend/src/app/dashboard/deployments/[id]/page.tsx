"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  useDeploymentDetail,
  DeploymentStatus,
} from "@/lib/hooks/useDeploymentDetail";
import { apiRequest, ApiError } from "@/lib/api";
import type { Deployment } from "@/lib/types/dashboard";

// ─── Constants ────────────────────────────────────────────────────────────────
const STREAM_URL = `${process.env.NEXT_PUBLIC_API_URL}/api/projects/deployments/logs/stream`;

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<
  DeploymentStatus,
  { label: string; color: string; bg: string; ring: string; pulse: boolean }
> = {
  queued: {
    label: "Queued",
    color: "#fbbf24",
    bg: "rgba(251,191,36,0.1)",
    ring: "rgba(251,191,36,0.3)",
    pulse: false,
  },
  cloning: {
    label: "Cloning",
    color: "#22d3ee",
    bg: "rgba(34,211,238,0.1)",
    ring: "rgba(34,211,238,0.3)",
    pulse: true,
  },
  building: {
    label: "Building",
    color: "#60a5fa",
    bg: "rgba(96,165,250,0.1)",
    ring: "rgba(96,165,250,0.3)",
    pulse: true,
  },
  starting: {
    label: "Starting",
    color: "#a78bfa",
    bg: "rgba(167,139,250,0.1)",
    ring: "rgba(167,139,250,0.3)",
    pulse: true,
  },
  running: {
    label: "Live",
    color: "#34d399",
    bg: "rgba(52,211,153,0.1)",
    ring: "rgba(52,211,153,0.3)",
    pulse: false,
  },
  failed: {
    label: "Failed",
    color: "#f87171",
    bg: "rgba(248,113,113,0.1)",
    ring: "rgba(248,113,113,0.3)",
    pulse: false,
  },
  stopped: {
    label: "Stopped",
    color: "#6b7280",
    bg: "rgba(107,114,128,0.1)",
    ring: "rgba(107,114,128,0.3)",
    pulse: false,
  },
};

const TERMINAL_COLORS: Record<string, string> = {
  "❌": "#f87171",
  "✅": "#34d399",
  "✓": "#34d399",
  "🚀": "#a78bfa",
  "📦": "#60a5fa",
  "🔍": "#22d3ee",
  "🔨": "#fbbf24",
  "🐳": "#60a5fa",
  "📥": "#a78bfa",
  "⏳": "#94a3b8",
  "▶": "#34d399",
  "🔌": "#fbbf24",
  "🐍": "#34d399",
  ℹ: "#94a3b8",
  "[container]": "#f87171",
  "Failed:": "#f87171",
  "Error:": "#f87171",
};

function getLineColor(text: string): string {
  for (const [prefix, color] of Object.entries(TERMINAL_COLORS)) {
    if (text.includes(prefix)) return color;
  }
  if (text.includes("────")) return "#374151";
  return "#94a3b8";
}

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;

  const token = localStorage.getItem("shipstack_access_token");

  console.log(
    "🔑 Token from localStorage:",
    token ? `${token.substring(0, 20)}...` : "null",
  );
  return token;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: DeploymentStatus | null }) {
  if (!status) return null;
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold"
      style={{
        background: cfg.bg,
        color: cfg.color,
        boxShadow: `0 0 0 1px ${cfg.ring}`,
        fontFamily: "'DM Mono', monospace",
      }}
    >
      <span
        className="h-2 w-2 rounded-full"
        style={{
          background: cfg.color,
          animation: cfg.pulse ? "pulse 1.5s ease-in-out infinite" : "none",
        }}
      />
      {cfg.label}
    </span>
  );
}

function MetaChip({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div
      className="flex flex-col gap-0.5 rounded-xl px-3 py-2.5"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <span
        className="text-[10px] uppercase tracking-widest"
        style={{ color: "#4b5563" }}
      >
        {label}
      </span>
      <span
        className="text-[13px] text-slate-300 truncate"
        style={mono ? { fontFamily: "'DM Mono', monospace" } : {}}
      >
        {value}
      </span>
    </div>
  );
}

function ConnectionDot({
  isConnected,
  isReconnecting,
}: {
  isConnected: boolean;
  isReconnecting: boolean;
}) {
  if (isReconnecting) {
    return (
      <span
        className="flex items-center gap-1.5 text-[11px]"
        style={{ color: "#fbbf24", fontFamily: "'DM Mono', monospace" }}
      >
        <span
          className="h-1.5 w-1.5 rounded-full bg-amber-400"
          style={{ animation: "pulse 1s ease-in-out infinite" }}
        />
        reconnecting
      </span>
    );
  }
  if (isConnected) {
    return (
      <span
        className="flex items-center gap-1.5 text-[11px]"
        style={{ color: "#34d399", fontFamily: "'DM Mono', monospace" }}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        live
      </span>
    );
  }
  return (
    <span
      className="flex items-center gap-1.5 text-[11px]"
      style={{ color: "#6b7280", fontFamily: "'DM Mono', monospace" }}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-slate-600" />
      offline
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DeploymentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const deploymentId = params.id as string;

  const [token] = useState<string | null>(() => getAuthToken());
  const [metadata, setMetadata] = useState<Deployment | null>(null);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [stopping, setStopping] = useState(false);

  // Load initial deployment metadata from REST
  useEffect(() => {
    if (!deploymentId) return;
    apiRequest<Deployment>(`/api/projects/deployments/${deploymentId}`)
      .then(setMetadata)
      .catch((e) =>
        setMetaError(
          e instanceof ApiError ? e.message : "Failed to load deployment",
        ),
      );
  }, [deploymentId]);

  const {
    lines,
    deployment: liveState,
    isConnected,
    isReconnecting,
    replayDone,
    clearLogs,
    reconnect,
  } = useDeploymentDetail({
    deploymentId,
    streamBaseUrl: STREAM_URL,
    token,
    maxLines: 500,
  });

  // Merge live SSE state onto REST metadata
  const effectiveStatus =
    (liveState.status as DeploymentStatus | null) ??
    (metadata?.status as DeploymentStatus | null);
  const effectivePublicUrl = liveState.publicUrl ?? metadata?.publicUrl ?? null;
  const effectiveError =
    liveState.errorMessage ?? metadata?.errorMessage ?? null;
  const effectiveCommit = liveState.commitHash ?? metadata?.commitHash ?? null;

  const isTerminal =
    effectiveStatus === "running" ||
    effectiveStatus === "failed" ||
    effectiveStatus === "stopped";

  // ── Terminal scroll ──────────────────────────────────────────────────────
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useLayoutEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [lines, autoScroll]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setAutoScroll(distFromBottom < 40);
  }, []);

  // ── Stop deployment ──────────────────────────────────────────────────────
  const handleStop = async () => {
    setStopping(true);
    try {
      await apiRequest(`/api/projects/deployments/${deploymentId}/stop`, {
        method: "POST",
      });
    } catch {
      /* ignore */
    } finally {
      setStopping(false);
    }
  };

  // ── Derive project name ──────────────────────────────────────────────────
  const projectName =
    typeof metadata?.projectId === "object"
      ? (metadata.projectId as any).name
      : null;

  const projectId =
    typeof metadata?.projectId === "object"
      ? (metadata.projectId as any)._id
      : metadata?.projectId;

  if (metaError) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <p className="text-red-400 mb-4">{metaError}</p>
        <Link
          href="/dashboard/deployments"
          className="text-sm text-indigo-400 hover:text-indigo-300"
        >
          ← Back to deployments
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6" style={{ fontFamily: "'Sora', sans-serif" }}>
      {/* ── Header ── */}
      <div>
        <div className="flex items-center gap-2 mb-3 text-xs">
          <Link
            href="/dashboard/deployments"
            className="text-slate-600 hover:text-slate-400 transition-colors"
          >
            Deployments
          </Link>
          <span className="text-slate-800">·</span>
          {projectName && projectId && (
            <>
              <Link
                href={`/dashboard/projects/${projectId}`}
                className="text-slate-600 hover:text-slate-400 transition-colors"
              >
                {projectName}
              </Link>
              <span className="text-slate-800">·</span>
            </>
          )}
          <span className="text-slate-700 font-mono" title={deploymentId}>
            {deploymentId.slice(-8)}
          </span>
        </div>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1
                className="text-3xl font-bold text-white"
                style={{ letterSpacing: "-0.02em" }}
              >
                {projectName ? `${projectName}` : "Deployment"}
              </h1>
              <StatusBadge status={effectiveStatus} />
            </div>
            {effectiveCommit && (
              <p
                className="mt-1 text-xs text-slate-600"
                style={{ fontFamily: "'DM Mono', monospace" }}
              >
                commit {effectiveCommit.slice(0, 7)}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {effectiveStatus === "running" && effectivePublicUrl && (
              <a
                href={effectivePublicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-all hover:scale-[1.02]"
                style={{
                  background: "linear-gradient(135deg, #10b981, #059669)",
                  boxShadow: "0 0 20px rgba(16,185,129,0.25)",
                }}
              >
                ↗ Open app
              </a>
            )}

            {effectiveStatus && !isTerminal && (
              <button
                onClick={handleStop}
                disabled={stopping}
                className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium text-red-300 transition-all hover:scale-[1.02] disabled:opacity-50"
                style={{
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.25)",
                }}
              >
                {stopping ? "Stopping…" : "■ Stop"}
              </button>
            )}

            <button
              onClick={clearLogs}
              className="rounded-lg px-3 py-2 text-xs transition-colors"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#6b7280",
                fontFamily: "'DM Mono', monospace",
                cursor: "pointer",
              }}
            >
              clear
            </button>
          </div>
        </div>
      </div>

      {/* ── Error banner ── */}
      {effectiveStatus === "failed" && effectiveError && (
        <div
          className="flex items-start gap-3 rounded-xl p-4 text-sm"
          style={{
            background: "rgba(239,68,68,0.07)",
            border: "1px solid rgba(239,68,68,0.2)",
            color: "#fca5a5",
          }}
        >
          <span className="text-lg shrink-0">⚠</span>
          <span
            style={{ fontFamily: "'DM Mono', monospace", fontSize: "12px" }}
          >
            {effectiveError}
          </span>
        </div>
      )}

      {/* ── Success banner ── */}
      {effectiveStatus === "running" && effectivePublicUrl && (
        <div
          className="flex items-center gap-3 rounded-xl p-4"
          style={{
            background: "rgba(52,211,153,0.07)",
            border: "1px solid rgba(52,211,153,0.2)",
          }}
        >
          <span className="text-emerald-400">✅</span>
          <span className="text-emerald-300 text-sm">
            Deployment is live at{" "}
            <a
              href={effectivePublicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-emerald-200 transition-colors"
              style={{ fontFamily: "'DM Mono', monospace" }}
            >
              {effectivePublicUrl}
            </a>
          </span>
        </div>
      )}

      {/* ── Metadata chips ── */}
      {metadata && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <MetaChip
            label="Framework"
            value={
              typeof metadata.projectId === "object"
                ? ((metadata.projectId as any).framework ?? "—")
                : "—"
            }
          />
          <MetaChip label="Branch" value={metadata.branch ?? "—"} mono />
          <MetaChip
            label="Started"
            value={
              metadata.createdAt
                ? new Date(metadata.createdAt).toLocaleString()
                : "—"
            }
          />
          <MetaChip
            label="Repository"
            value={
              (typeof metadata.projectId === "object"
                ? (metadata.projectId as any).repoUrl
                : null
              )
                ?.replace("https://github.com/", "")
                ?.split("/")
                .slice(0, 2)
                .join("/") ?? "—"
            }
            mono
          />
        </div>
      )}

      {/* ── Terminal ── */}
      <div
        className="relative overflow-hidden rounded-2xl"
        style={{
          border: "1px solid rgba(99,102,241,0.2)",
          background: "#050710",
          boxShadow: "0 0 60px rgba(99,102,241,0.06)",
        }}
      >
        {/* Glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 30% at 50% 0%, rgba(99,102,241,0.1), transparent 70%)",
          }}
        />

        {/* Title bar */}
        <div
          className="relative flex items-center justify-between px-4 py-3"
          style={{
            background: "#0a0c18",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <div className="flex items-center gap-4">
            {/* Traffic lights */}
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-full bg-red-500/70" />
              <div className="h-3 w-3 rounded-full bg-yellow-500/70" />
              <div className="h-3 w-3 rounded-full bg-green-500/70" />
            </div>
            <span
              style={{
                color: "#374151",
                fontSize: "12px",
                fontFamily: "'DM Mono', monospace",
              }}
            >
              {projectName ?? "deployment"} — build log
            </span>
          </div>

          <div className="flex items-center gap-3">
            <ConnectionDot
              isConnected={isConnected}
              isReconnecting={isReconnecting}
            />
            {lines.length > 0 && (
              <span
                style={{
                  color: "#374151",
                  fontSize: "11px",
                  fontFamily: "'DM Mono', monospace",
                }}
              >
                {lines.length} line{lines.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        {/* Log output */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="relative overflow-auto px-4 py-4"
          style={{
            maxHeight: "560px",
            minHeight: "240px",
            fontFamily: "'DM Mono', monospace",
            fontSize: "12.5px",
            lineHeight: "1.65",
          }}
        >
          {lines.length === 0 ? (
            <div style={{ color: "#374151" }}>
              <span>
                $ waiting for deployment logs
                <span style={{ animation: "blink-cur 1s step-start infinite" }}>
                  _
                </span>
              </span>
              {isReconnecting && (
                <div style={{ color: "#fbbf24", marginTop: 4 }}>
                  ⟳ reconnecting to log stream…
                </div>
              )}
            </div>
          ) : (
            <>
              {lines.map((line, i) => (
                <div
                  key={line.id}
                  style={{
                    color: getLineColor(line.text),
                    animation:
                      i >= lines.length - 5
                        ? "log-enter 0.2s ease-out both"
                        : "none",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                  }}
                >
                  <span style={{ color: "#1f2937", userSelect: "none" }}>
                    {new Date(line.timestamp).toISOString().slice(11, 19)}{" "}
                  </span>
                  {line.text}
                </div>
              ))}
            </>
          )}

          {/* Blinking cursor while active */}
          {!isTerminal && (
            <span
              className="ml-1 inline-block h-3.5 w-1.5 align-middle"
              style={{
                background: "#4f46e5",
                animation: "blink-cur 1s step-start infinite",
              }}
            />
          )}

          <div ref={bottomRef} />
        </div>

        {/* Jump to latest */}
        {!autoScroll && lines.length > 0 && (
          <button
            onClick={() => {
              setAutoScroll(true);
              bottomRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "end",
              });
            }}
            className="absolute bottom-4 right-4 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs backdrop-blur"
            style={{
              background: "rgba(99,102,241,0.2)",
              border: "1px solid rgba(99,102,241,0.35)",
              color: "#818cf8",
              fontFamily: "'DM Mono', monospace",
              cursor: "pointer",
            }}
          >
            ↓ jump to latest
          </button>
        )}
      </div>

      {/* ── CSS ── */}
      <style jsx global>{`
        @keyframes blink-cur {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0;
          }
        }
        @keyframes log-enter {
          from {
            opacity: 0;
            transform: translateY(3px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.3;
          }
        }
      `}</style>
    </div>
  );
}
