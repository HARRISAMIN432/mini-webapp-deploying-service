"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiRequest, ApiError } from "@/lib/api";
import type { Deployment, DeploymentStatus } from "@/lib/types/dashboard";

function StatusBadge({ status }: { status: DeploymentStatus | string }) {
  const map: Record<
    string,
    { dot: string; bg: string; text: string; label: string }
  > = {
    queued: {
      dot: "bg-amber-400 animate-pulse",
      bg: "bg-amber-50",
      text: "text-amber-700",
      label: "Queued",
    },
    cloning: {
      dot: "bg-blue-400 animate-pulse",
      bg: "bg-blue-50",
      text: "text-blue-700",
      label: "Cloning",
    },
    building: {
      dot: "bg-violet-400 animate-pulse",
      bg: "bg-violet-50",
      text: "text-violet-700",
      label: "Building",
    },
    starting: {
      dot: "bg-cyan-400 animate-pulse",
      bg: "bg-cyan-50",
      text: "text-cyan-700",
      label: "Starting",
    },
    running: {
      dot: "bg-green-500",
      bg: "bg-green-50",
      text: "text-green-700",
      label: "Live",
    },
    failed: {
      dot: "bg-red-500",
      bg: "bg-red-50",
      text: "text-red-700",
      label: "Failed",
    },
    stopped: {
      dot: "bg-gray-400",
      bg: "bg-gray-100",
      text: "text-gray-600",
      label: "Stopped",
    },
  };
  const s = map[status] ?? {
    dot: "bg-gray-400",
    bg: "bg-gray-100",
    text: "text-gray-600",
    label: status,
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.bg} ${s.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.dot}`} />
      {s.label}
    </span>
  );
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function DeploymentsPage() {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = () =>
      apiRequest<Deployment[]>("/api/projects/deployments")
        .then((d) => {
          setDeployments(d);
          setLoading(false);
        })
        .catch((e) => {
          setError(
            e instanceof ApiError ? e.message : "Failed to load deployments",
          );
          setLoading(false);
        });
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="p-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Deployments</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            All deployments across your projects
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Auto-refreshing
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7" stroke="#EF4444" strokeWidth="1.5" />
            <path
              d="M8 5v3.5M8 11h.01"
              stroke="#EF4444"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-violet-600 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-500">Loading deployments…</p>
          </div>
        ) : deployments.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle
                  cx="10"
                  cy="10"
                  r="8.5"
                  stroke="#9CA3AF"
                  strokeWidth="1.5"
                />
                <path d="M7 8.5L11.5 10L7 11.5V8.5Z" fill="#9CA3AF" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-700">
              No deployments yet
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Create a project and deploy to see results here
            </p>
            <Link
              href="/dashboard/projects/new"
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-violet-600 hover:text-violet-700"
            >
              + New Project
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Public URL
                  </th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {deployments.map((item) => (
                  <tr
                    key={item._id}
                    className="hover:bg-gray-50/60 transition-colors"
                  >
                    <td className="px-6 py-3.5">
                      <p className="text-sm font-medium text-gray-900">
                        {typeof item.projectId === "string"
                          ? item.projectId
                          : item.projectId.name}
                      </p>
                      <p className="text-xs text-gray-400 font-mono mt-0.5">
                        {item._id.slice(-8)}
                      </p>
                    </td>
                    <td className="px-6 py-3.5">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-6 py-3.5">
                      <p className="text-sm text-gray-700">
                        {relativeTime(item.createdAt)}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(item.createdAt).toLocaleDateString(
                          undefined,
                          { month: "short", day: "numeric", year: "numeric" },
                        )}
                      </p>
                    </td>
                    <td className="px-6 py-3.5">
                      {item.publicUrl ? (
                        <a
                          href={item.publicUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-violet-600 hover:text-violet-700 font-mono truncate max-w-[200px] block"
                        >
                          {item.publicUrl.replace(/^https?:\/\//, "")}
                        </a>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <Link
                        href={`/dashboard/deployments/${item._id}`}
                        className="text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
