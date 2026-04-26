"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { projectApi } from "@/lib/api";
import type { DeploymentSummary, PaginatedDeployments } from "@/lib/api";

interface DeploymentHistoryProps {
  projectId: string;
  initialData: PaginatedDeployments;
  onRollback?: () => void;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> =
  {
    running: {
      bg: "bg-emerald-500/10 border-emerald-500/20",
      text: "text-emerald-400",
      dot: "bg-emerald-400",
    },
    queued: {
      bg: "bg-blue-500/10 border-blue-500/20",
      text: "text-blue-400",
      dot: "bg-blue-400",
    },
    cloning: {
      bg: "bg-indigo-500/10 border-indigo-500/20",
      text: "text-indigo-400",
      dot: "bg-indigo-400",
    },
    building: {
      bg: "bg-violet-500/10 border-violet-500/20",
      text: "text-violet-400",
      dot: "bg-violet-400",
    },
    starting: {
      bg: "bg-cyan-500/10 border-cyan-500/20",
      text: "text-cyan-400",
      dot: "bg-cyan-400",
    },
    stopped: {
      bg: "bg-slate-500/10 border-slate-500/20",
      text: "text-slate-400",
      dot: "bg-slate-400",
    },
    failed: {
      bg: "bg-red-500/10 border-red-500/20",
      text: "text-red-400",
      dot: "bg-red-400",
    },
  };

const TRIGGER_LABELS: Record<string, string> = {
  manual: "Manual",
  webhook: "GitHub Push",
  rollback: "Rollback",
  redeploy: "Redeploy",
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.stopped;
  const isActive = ["queued", "cloning", "building", "starting"].includes(
    status,
  );
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${s.bg} ${s.text}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${s.dot}`}
        style={isActive ? { animation: "pulse 1.5s infinite" } : {}}
      />
      {status}
    </span>
  );
}

function HealthBadge({ health }: { health: string }) {
  const map: Record<string, { color: string; label: string }> = {
    healthy: { color: "bg-emerald-400", label: "Healthy" },
    unhealthy: { color: "bg-red-400", label: "Unhealthy" },
    unknown: { color: "bg-slate-500", label: "Unknown" },
  };
  const cfg = map[health] ?? map.unknown;
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${cfg.color}`}
      title={cfg.label}
    />
  );
}

function formatDuration(d: DeploymentSummary): string {
  if (!d.startedAt || !d.completedAt) return "—";
  const ms =
    new Date(d.completedAt).getTime() - new Date(d.startedAt).getTime();
  if (ms < 0) return "—";
  const s = Math.floor(ms / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function DeploymentHistory({
  projectId,
  initialData,
  onRollback,
}: DeploymentHistoryProps) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [rolling, setRolling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadPage = useCallback(
    async (p: number) => {
      setLoading(true);
      try {
        const result = await projectApi.listDeployments(projectId, p);
        setData(result);
        setPage(p);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    },
    [projectId],
  );

  const handleRollback = async (deploymentId: string) => {
    if (
      !confirm("Roll back to this deployment? A new deployment will be queued.")
    )
      return;
    setRolling(deploymentId);
    try {
      await projectApi.rollback(projectId, deploymentId);
      onRollback?.();
      await loadPage(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rollback failed");
    } finally {
      setRolling(null);
    }
  };

  return (
    <div>
      {error && (
        <div className="mb-3 rounded-xl border border-red-500/30 bg-red-500/8 px-4 py-2.5 text-xs text-red-300">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-[#1a2540] overflow-hidden">
        {/* Header */}
        <div
          className="grid px-4 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-slate-600 border-b border-[#1a2540] bg-[#080f1e]"
          style={{ gridTemplateColumns: "90px 70px 80px 90px 70px 60px 1fr" }}
        >
          <span>Commit</span>
          <span>Branch</span>
          <span>Status</span>
          <span>Trigger</span>
          <span>Duration</span>
          <span>Health</span>
          <span className="text-right">Actions</span>
        </div>

        {loading && (
          <div className="px-4 py-8 text-center text-sm text-slate-600">
            Loading…
          </div>
        )}

        {!loading && data.deployments.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-slate-600">
            No deployments yet
          </div>
        )}

        {!loading &&
          data.deployments.map((d) => (
            <div
              key={d._id}
              className="grid px-4 py-3 border-b border-[#111c30] last:border-0 items-center gap-3 hover:bg-[#0c1625] transition-colors"
              style={{
                gridTemplateColumns: "90px 70px 80px 90px 70px 60px 1fr",
              }}
            >
              <span
                className="font-mono text-xs text-indigo-400 cursor-pointer hover:text-indigo-300 truncate"
                title={d.commitHash ?? "—"}
                onClick={() => router.push(`/dashboard/deployments/${d._id}`)}
              >
                {d.commitHash?.slice(0, 7) ?? "—"}
              </span>

              <span className="text-xs text-slate-500 font-mono truncate">
                {d.branch}
              </span>

              <StatusBadge status={d.status} />

              <span className="text-[10px] text-slate-500">
                {TRIGGER_LABELS[d.triggerSource] ?? d.triggerSource}
              </span>

              <span className="text-xs text-slate-500">
                {formatDuration(d)}
              </span>

              <div className="flex items-center gap-2">
                <HealthBadge health={d.healthStatus} />
                <span className="text-[10px] text-slate-600">
                  {timeAgo(d.createdAt)}
                </span>
              </div>

              <div className="flex items-center justify-end gap-1.5">
                <button
                  onClick={() => router.push(`/dashboard/deployments/${d._id}`)}
                  className="px-2 py-1 text-[10px] rounded-lg border border-[#1e293b] text-slate-500 hover:text-indigo-400 hover:border-indigo-500/30 transition-all"
                >
                  Logs
                </button>
                {(d.status === "running" ||
                  d.status === "stopped" ||
                  d.status === "failed") && (
                  <button
                    onClick={() => handleRollback(d._id)}
                    disabled={!!rolling}
                    className="px-2 py-1 text-[10px] rounded-lg border border-[#1e293b] text-slate-500 hover:text-amber-400 hover:border-amber-500/30 transition-all disabled:opacity-40"
                  >
                    {rolling === d._id ? "…" : "Rollback"}
                  </button>
                )}
              </div>
            </div>
          ))}
      </div>

      {/* Pagination */}
      {data.pagination.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-slate-600">
            Page {page} of {data.pagination.totalPages} ·{" "}
            {data.pagination.total} total
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => loadPage(page - 1)}
              disabled={page <= 1 || loading}
              className="px-3 py-1.5 text-xs rounded-lg border border-[#1e293b] text-slate-500 hover:text-white hover:border-slate-600 disabled:opacity-30 transition-all"
            >
              ← Prev
            </button>
            <button
              onClick={() => loadPage(page + 1)}
              disabled={page >= data.pagination.totalPages || loading}
              className="px-3 py-1.5 text-xs rounded-lg border border-[#1e293b] text-slate-500 hover:text-white hover:border-slate-600 disabled:opacity-30 transition-all"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      <style
        dangerouslySetInnerHTML={{
          __html: `@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }`,
        }}
      />
    </div>
  );
}
