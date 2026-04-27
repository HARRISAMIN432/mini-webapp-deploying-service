"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/api";
import type { Deployment, Project } from "@/lib/types/dashboard";

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<
    string,
    { dot: string; bg: string; text: string; label: string }
  > = {
    running: {
      dot: "bg-green-500",
      bg: "bg-green-50",
      text: "text-green-700",
      label: "Live",
    },
    success: {
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
    queued: {
      dot: "bg-amber-400",
      bg: "bg-amber-50",
      text: "text-amber-700",
      label: "Building",
    },
    cloning: {
      dot: "bg-amber-400",
      bg: "bg-amber-50",
      text: "text-amber-700",
      label: "Building",
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
      <span
        className={`w-1.5 h-1.5 rounded-full ${s.dot} ${status === "queued" || status === "cloning" ? "animate-pulse" : ""}`}
      />
      {s.label}
    </span>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  subPositive,
}: {
  label: string;
  value: string;
  sub?: string;
  subPositive?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-1">
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <p className="text-2xl font-bold text-gray-900 tracking-tight">{value}</p>
      {sub && (
        <p
          className={`text-xs font-medium ${subPositive ? "text-green-600" : "text-red-500"}`}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

// ─── Relative time helper ─────────────────────────────────────────────────────

function relativeTime(dateStr?: string): string {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.floor(hrs / 24)} days ago`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [deployments, setDeployments] = useState<Deployment[]>([]);

  useEffect(() => {
    const load = async () => {
      const [projectData, deploymentData] = await Promise.all([
        apiRequest<Project[]>("/api/projects"),
        apiRequest<Deployment[]>("/api/projects/deployments"),
      ]);
      setProjects(projectData);
      setDeployments(deploymentData);
    };
    load().catch(() => {});
  }, []);

  const stats = useMemo(
    () => [
      {
        label: "Total deployments",
        value: String(deployments.length || 0),
        sub: "+12 this week",
        subPositive: true,
      },
      {
        label: "Success rate",
        value: deployments.length
          ? `${
              Math.round(
                (deployments.filter((d) => d.status === "running").length /
                  deployments.length) *
                  1000,
              ) / 10
            }%`
          : "—",
        sub: "+0.4% vs last week",
        subPositive: true,
      },
      {
        label: "Total Projects",
        value: String(projects.length || 0),
      },
      {
        label: "Queued Builds",
        value: String(
          deployments.filter(
            (d) => d.status === "queued" || d.status === "cloning",
          ).length,
        ),
        sub: "Running now",
        subPositive: true,
      },
    ],
    [deployments, projects],
  );

  const recentDeployments = useMemo(
    () =>
      [...deployments]
        .sort((a, b) => {
          const da = new Date((a as any).createdAt || 0).getTime();
          const db = new Date((b as any).createdAt || 0).getTime();
          return db - da;
        })
        .slice(0, 8),
    [deployments],
  );

  return (
    <div className="p-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Monitor your deployments and projects
          </p>
        </div>
        <Link
          href="/dashboard/projects/new"
          className="inline-flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M7 1v12M1 7h12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          New deployment
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* Recent deployments */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">
            Recent deployments
          </h2>
          <Link
            href="/dashboard/deployments"
            className="text-xs text-violet-600 hover:text-violet-700 font-medium"
          >
            View all →
          </Link>
        </div>

        {recentDeployments.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <circle
                  cx="9"
                  cy="9"
                  r="7.5"
                  stroke="#9CA3AF"
                  strokeWidth="1.5"
                />
                <path d="M7 7.5L11 9L7 10.5V7.5Z" fill="#9CA3AF" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">No deployments yet</p>
            <Link
              href="/dashboard/projects/new"
              className="mt-3 inline-block text-xs text-violet-600 hover:underline font-medium"
            >
              Create your first project →
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Project
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Deployed
                </th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentDeployments.map((dep) => {
                const project = projects.find((p) => {
                  const pid = (p as any)._id?.toString() || (p as any).id;
                  const dpid =
                    (dep as any).projectId?.toString() ||
                    (dep as any).project?.toString();
                  return pid === dpid;
                });
                const depId =
                  (dep as any)._id?.toString() || (dep as any).id || "";
                const branch =
                  (dep as any).branch || (dep as any).gitBranch || "main";
                const commit =
                  (dep as any).commitHash?.slice(0, 7) ||
                  (dep as any).commit?.slice(0, 7) ||
                  "";
                const projectName =
                  (project as any)?.name ||
                  (dep as any).projectName ||
                  "Unknown";

                // Calculate duration
                const startedAt =
                  (dep as any).startedAt || (dep as any).createdAt;
                const finishedAt =
                  (dep as any).finishedAt || (dep as any).updatedAt;
                let duration = "—";
                if (startedAt && finishedAt) {
                  const secs = Math.floor(
                    (new Date(finishedAt).getTime() -
                      new Date(startedAt).getTime()) /
                      1000,
                  );
                  if (secs > 0) {
                    const m = Math.floor(secs / 60);
                    const s = secs % 60;
                    duration = m > 0 ? `${m}m ${s}s` : `${s}s`;
                  }
                }

                return (
                  <tr
                    key={depId}
                    className="hover:bg-gray-50/60 transition-colors"
                  >
                    <td className="px-6 py-3.5">
                      <p className="text-sm font-medium text-gray-900">
                        {projectName}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {branch}
                        {commit ? ` · ${commit}` : ""}
                      </p>
                    </td>
                    <td className="px-6 py-3.5">
                      <StatusBadge status={dep.status} />
                    </td>
                    <td className="px-6 py-3.5 text-sm text-gray-600">
                      {duration}
                    </td>
                    <td className="px-6 py-3.5 text-sm text-gray-500">
                      {relativeTime((dep as any).createdAt)}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <Link
                        href={`/dashboard/deployments/${depId}`}
                        className="text-xs text-gray-400 hover:text-gray-700 font-medium"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Quick actions */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        <Link
          href="/dashboard/projects"
          className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-5 py-4 hover:border-gray-300 hover:shadow-sm transition-all group"
        >
          <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0 group-hover:bg-violet-100 transition-colors">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect
                x="1"
                y="1"
                width="6.5"
                height="6.5"
                rx="1.5"
                stroke="#7C3AED"
                strokeWidth="1.5"
              />
              <rect
                x="8.5"
                y="1"
                width="6.5"
                height="6.5"
                rx="1.5"
                stroke="#7C3AED"
                strokeWidth="1.5"
              />
              <rect
                x="1"
                y="8.5"
                width="6.5"
                height="6.5"
                rx="1.5"
                stroke="#7C3AED"
                strokeWidth="1.5"
              />
              <rect
                x="8.5"
                y="8.5"
                width="6.5"
                height="6.5"
                rx="1.5"
                stroke="#7C3AED"
                strokeWidth="1.5"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">View Projects</p>
            <p className="text-xs text-gray-400">{projects.length} total</p>
          </div>
        </Link>
        <Link
          href="/dashboard/projects/new"
          className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-5 py-4 hover:border-gray-300 hover:shadow-sm transition-all group"
        >
          <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0 group-hover:bg-gray-100 transition-colors">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M8 2v12M2 8h12"
                stroke="#374151"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">New Project</p>
            <p className="text-xs text-gray-400">
              Import or create from scratch
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
