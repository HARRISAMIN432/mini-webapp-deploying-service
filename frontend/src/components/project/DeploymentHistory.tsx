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

const STATUS_CFG: Record<string, { bg: string; text: string; dot: string }> = {
  running: { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500" },
  queued: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" },
  cloning: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-400" },
  building: {
    bg: "bg-violet-50",
    text: "text-violet-700",
    dot: "bg-violet-500",
  },
  starting: { bg: "bg-cyan-50", text: "text-cyan-700", dot: "bg-cyan-500" },
  stopped: { bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400" },
  failed: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
};

const TRIGGER_LABELS: Record<string, string> = {
  manual: "Manual",
  webhook: "GitHub Push",
  rollback: "Rollback",
  redeploy: "Redeploy",
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_CFG[status] ?? STATUS_CFG.stopped;
  const isActive = ["queued", "cloning", "building", "starting"].includes(
    status,
  );
  const labels: Record<string, string> = {
    running: "Live",
    queued: "Queued",
    cloning: "Cloning",
    building: "Building",
    starting: "Starting",
    stopped: "Stopped",
    failed: "Failed",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.bg} ${s.text}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.dot} ${isActive ? "animate-pulse" : ""}`}
      />
      {labels[status] ?? status}
    </span>
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
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="6" stroke="#EF4444" strokeWidth="1.5" />
            <path
              d="M7 4.5v3M7 9.5h.01"
              stroke="#EF4444"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          {error}
        </div>
      )}

      <div className="border border-gray-200 rounded-xl overflow-hidden">
        {/* Table header */}
        <div
          className="grid px-5 py-3 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-400 uppercase tracking-wider"
          style={{ gridTemplateColumns: "80px 90px 100px 110px 80px 1fr" }}
        >
          <span>Commit</span>
          <span>Branch</span>
          <span>Status</span>
          <span>Trigger</span>
          <span>Duration</span>
          <span className="text-right">Actions</span>
        </div>

        {loading && (
          <div className="px-5 py-10 text-center">
            <div className="w-6 h-6 border-2 border-gray-200 border-t-violet-600 rounded-full animate-spin mx-auto" />
          </div>
        )}

        {!loading && data.deployments.length === 0 && (
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-gray-500">No deployments yet</p>
          </div>
        )}

        {!loading &&
          data.deployments.map((d, i) => (
            <div
              key={d._id}
              className={`grid px-5 py-3.5 items-center gap-3 hover:bg-gray-50/60 transition-colors ${
                i < data.deployments.length - 1
                  ? "border-b border-gray-100"
                  : ""
              }`}
              style={{ gridTemplateColumns: "80px 90px 100px 110px 80px 1fr" }}
            >
              <span
                className="font-mono text-xs text-violet-600 cursor-pointer hover:text-violet-700 truncate"
                title={d.commitHash ?? "—"}
                onClick={() => router.push(`/dashboard/deployments/${d._id}`)}
              >
                {d.commitHash?.slice(0, 7) ?? "—"}
              </span>

              <span className="text-xs text-gray-500 font-mono truncate">
                {d.branch}
              </span>

              <StatusBadge status={d.status} />

              <span className="text-xs text-gray-500">
                {TRIGGER_LABELS[d.triggerSource] ?? d.triggerSource}
              </span>

              <div>
                <span className="text-xs text-gray-700 font-medium">
                  {formatDuration(d)}
                </span>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {timeAgo(d.createdAt)}
                </p>
              </div>

              <div className="flex items-center justify-end gap-1.5">
                <button
                  onClick={() => router.push(`/dashboard/deployments/${d._id}`)}
                  className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-500 hover:text-gray-800 hover:border-gray-300 transition-all"
                >
                  Logs
                </button>
                {(d.status === "running" ||
                  d.status === "stopped" ||
                  d.status === "failed") && (
                  <button
                    onClick={() => handleRollback(d._id)}
                    disabled={!!rolling}
                    className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-500 hover:text-amber-600 hover:border-amber-200 hover:bg-amber-50 transition-all disabled:opacity-40"
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
          <span className="text-xs text-gray-400">
            Page {page} of {data.pagination.totalPages} ·{" "}
            {data.pagination.total} total
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => loadPage(page - 1)}
              disabled={page <= 1 || loading}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-500 hover:text-gray-800 hover:border-gray-300 disabled:opacity-40 transition-all"
            >
              ← Prev
            </button>
            <button
              onClick={() => loadPage(page + 1)}
              disabled={page >= data.pagination.totalPages || loading}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-500 hover:text-gray-800 hover:border-gray-300 disabled:opacity-40 transition-all"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
