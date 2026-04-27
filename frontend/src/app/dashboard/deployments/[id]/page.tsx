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

// ─── Status config (consistent with dashboard) ────────────────────────────────
const STATUS_CONFIG: Record<
  DeploymentStatus,
  { label: string; dotClass: string; bgClass: string; textClass: string }
> = {
  queued: {
    label: "Building",
    dotClass: "bg-amber-400",
    bgClass: "bg-amber-50",
    textClass: "text-amber-700",
  },
  cloning: {
    label: "Building",
    dotClass: "bg-amber-400 animate-pulse",
    bgClass: "bg-amber-50",
    textClass: "text-amber-700",
  },
  building: {
    label: "Building",
    dotClass: "bg-amber-400 animate-pulse",
    bgClass: "bg-amber-50",
    textClass: "text-amber-700",
  },
  starting: {
    label: "Building",
    dotClass: "bg-amber-400 animate-pulse",
    bgClass: "bg-amber-50",
    textClass: "text-amber-700",
  },
  running: {
    label: "Live",
    dotClass: "bg-green-500",
    bgClass: "bg-green-50",
    textClass: "text-green-700",
  },
  failed: {
    label: "Failed",
    dotClass: "bg-red-500",
    bgClass: "bg-red-50",
    textClass: "text-red-700",
  },
  stopped: {
    label: "Stopped",
    dotClass: "bg-gray-400",
    bgClass: "bg-gray-100",
    textClass: "text-gray-600",
  },
};

const TERMINAL_COLORS: Record<string, string> = {
  "❌": "#ef4444",
  "✅": "#10b981",
  "✓": "#10b981",
  "🚀": "#8b5cf6",
  "📦": "#3b82f6",
  "🔍": "#06b6d4",
  "🔨": "#f59e0b",
  "🐳": "#3b82f6",
  "📥": "#8b5cf6",
  "⏳": "#6b7280",
  "▶": "#10b981",
  "🔌": "#f59e0b",
  "🐍": "#10b981",
  ℹ: "#6b7280",
  "[container]": "#ef4444",
  "Failed:": "#ef4444",
  "Error:": "#ef4444",
};

function getLineColor(text: string): string {
  for (const [prefix, color] of Object.entries(TERMINAL_COLORS)) {
    if (text.includes(prefix)) return color;
  }
  if (text.includes("────")) return "#d1d5db";
  return "#9ca3af";
}

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("shipstack_access_token");
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: DeploymentStatus | null }) {
  if (!status) return null;
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bgClass} ${cfg.textClass}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotClass}`} />
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
    <div className="bg-gray-50 rounded-lg px-3 py-2">
      <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-0.5">
        {label}
      </p>
      <p className={`text-sm text-gray-700 ${mono ? "font-mono" : ""}`}>
        {value}
      </p>
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
      <span className="flex items-center gap-1.5 text-xs text-amber-600 font-mono">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
        reconnecting
      </span>
    );
  }
  if (isConnected) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-green-600 font-mono">
        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
        live
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-xs text-gray-400 font-mono">
      <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
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
      <div className="p-8">
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <p className="text-red-600 mb-4">{metaError}</p>
          <Link
            href="/dashboard/deployments"
            className="text-sm text-violet-600 hover:text-violet-700 font-medium"
          >
            ← Back to deployments
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
          <Link
            href="/dashboard/deployments"
            className="hover:text-gray-700 transition-colors"
          >
            Deployments
          </Link>
          <span>/</span>
          {projectName && projectId && (
            <>
              <Link
                href={`/dashboard/projects/${projectId}`}
                className="hover:text-gray-700 transition-colors"
              >
                {projectName}
              </Link>
              <span>/</span>
            </>
          )}
          <span className="font-mono text-gray-400">
            {deploymentId.slice(-8)}
          </span>
        </div>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-gray-900">
                {projectName ? `${projectName}` : "Deployment"}
              </h1>
              <StatusBadge status={effectiveStatus} />
            </div>
            {effectiveCommit && (
              <p className="mt-1 text-xs text-gray-400 font-mono">
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
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-all"
              >
                ↗ Open app
              </a>
            )}

            {effectiveStatus && !isTerminal && (
              <button
                onClick={handleStop}
                disabled={stopping}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-all disabled:opacity-50"
              >
                {stopping ? "Stopping…" : "■ Stop"}
              </button>
            )}

            <button
              onClick={clearLogs}
              className="px-3 py-2 text-xs font-mono text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              clear
            </button>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {effectiveStatus === "failed" && effectiveError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <span className="text-red-500">⚠️</span>
            <p className="text-sm text-red-700 font-mono">{effectiveError}</p>
          </div>
        </div>
      )}

      {/* Success banner */}
      {effectiveStatus === "running" && effectivePublicUrl && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <span className="text-green-600">✅</span>
            <p className="text-sm text-green-700">
              Deployment is live at{" "}
              <a
                href={effectivePublicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono underline hover:text-green-800 transition-colors"
              >
                {effectivePublicUrl}
              </a>
            </p>
          </div>
        </div>
      )}

      {/* Metadata chips */}
      {metadata && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
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

      {/* Terminal */}
      <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
        {/* Title bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-gray-100 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-full bg-red-400" />
              <div className="h-3 w-3 rounded-full bg-yellow-400" />
              <div className="h-3 w-3 rounded-full bg-green-400" />
            </div>
            <span className="text-xs text-gray-500 font-mono">
              {projectName ?? "deployment"} — build log
            </span>
          </div>

          <div className="flex items-center gap-3">
            <ConnectionDot
              isConnected={isConnected}
              isReconnecting={isReconnecting}
            />
            {lines.length > 0 && (
              <span className="text-xs text-gray-400 font-mono">
                {lines.length} line{lines.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        {/* Log output */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="overflow-auto p-4 font-mono text-xs"
          style={{
            maxHeight: "560px",
            minHeight: "240px",
            lineHeight: "1.6",
            background: "#0a0c14",
          }}
        >
          {lines.length === 0 ? (
            <div className="text-gray-600">
              <span>
                $ waiting for deployment logs
                <span className="animate-pulse">_</span>
              </span>
              {isReconnecting && (
                <div className="text-amber-600 mt-1">
                  ⟳ reconnecting to log stream…
                </div>
              )}
            </div>
          ) : (
            <>
              {lines.map((line, i) => (
                <div
                  key={line.id}
                  className="whitespace-pre-wrap break-all"
                  style={{
                    color: getLineColor(line.text),
                    animation:
                      i >= lines.length - 5 ? "fadeInUp 0.2s ease-out" : "none",
                  }}
                >
                  <span className="text-gray-700 select-none">
                    {new Date(line.timestamp).toISOString().slice(11, 19)}{" "}
                  </span>
                  {line.text}
                </div>
              ))}
            </>
          )}

          {/* Blinking cursor while active */}
          {!isTerminal && lines.length > 0 && (
            <span className="inline-block w-2 h-4 bg-violet-500 align-middle animate-pulse" />
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
            className="absolute bottom-4 right-4 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-mono bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all"
          >
            ↓ jump to latest
          </button>
        )}
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
