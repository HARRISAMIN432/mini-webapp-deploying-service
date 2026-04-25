"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiRequest, ApiError } from "@/lib/api";
import type {
  Deployment,
  DeploymentStatus,
  Project,
} from "@/lib/types/dashboard";

// ─── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<
  DeploymentStatus,
  { label: string; dot: string; badge: string }
> = {
  queued: {
    label: "Queued",
    dot: "bg-amber-400",
    badge: "bg-amber-400/10 text-amber-300 ring-1 ring-amber-400/25",
  },
  cloning: {
    label: "Cloning",
    dot: "bg-cyan-400 animate-pulse",
    badge: "bg-cyan-400/10 text-cyan-300 ring-1 ring-cyan-400/25",
  },
  building: {
    label: "Building",
    dot: "bg-blue-400 animate-pulse",
    badge: "bg-blue-400/10 text-blue-300 ring-1 ring-blue-400/25",
  },
  starting: {
    label: "Starting",
    dot: "bg-violet-400 animate-pulse",
    badge: "bg-violet-400/10 text-violet-300 ring-1 ring-violet-400/25",
  },
  running: {
    label: "Live",
    dot: "bg-emerald-400",
    badge: "bg-emerald-400/10 text-emerald-300 ring-1 ring-emerald-400/25",
  },
  failed: {
    label: "Failed",
    dot: "bg-red-400",
    badge: "bg-red-400/10 text-red-300 ring-1 ring-red-400/25",
  },
  stopped: {
    label: "Stopped",
    dot: "bg-slate-500",
    badge: "bg-slate-500/10 text-slate-400 ring-1 ring-slate-500/25",
  },
};

const FRAMEWORK_ICONS: Record<string, string> = {
  "Next.js": "⬡",
  React: "⚛",
  Vue: "◈",
  Nuxt: "◈",
  Svelte: "◆",
  Remix: "◎",
  Astro: "◉",
};

function timeAgo(date: string | Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#0b0d14] p-5 animate-pulse">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="h-10 w-10 rounded-xl bg-white/[0.05]" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-36 rounded bg-white/[0.06]" />
            <div className="h-3 w-52 rounded bg-white/[0.04]" />
          </div>
        </div>
        <div className="h-6 w-16 rounded-full bg-white/[0.05]" />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div
        className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl text-3xl"
        style={{
          background:
            "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))",
          border: "1px solid rgba(99,102,241,0.2)",
        }}
      >
        ⬡
      </div>
      <h3
        className="mb-2 text-lg font-semibold text-white"
        style={{ fontFamily: "'Sora', sans-serif" }}
      >
        No projects yet
      </h3>
      <p className="mb-6 text-sm text-slate-500 max-w-xs">
        Connect a repository and deploy your first project in under a minute.
      </p>
      <Link
        href="/dashboard/projects/new"
        className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
        style={{
          background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
          boxShadow: "0 0 24px rgba(99,102,241,0.35)",
        }}
      >
        <span>+</span> New Project
      </Link>
    </div>
  );
}

interface ProjectCardProps {
  project: Project;
  deployment?: Deployment;
  onDeploy: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

function ProjectCard({
  project,
  deployment,
  onDeploy,
  onDelete,
}: ProjectCardProps) {
  const [deployLoading, setDeployLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const status = deployment?.status ?? null;
  const cfg = status ? STATUS_CONFIG[status] : null;
  const isActive =
    status && ["queued", "cloning", "building", "starting"].includes(status);
  const frameworkIcon = FRAMEWORK_ICONS[project.framework] ?? "◇";

  const handleDeploy = async () => {
    setDeployLoading(true);
    try {
      await onDeploy(project._id);
    } finally {
      setDeployLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    setDeleteLoading(true);
    try {
      await onDelete(project._id);
    } finally {
      setDeleteLoading(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div
      className="group relative rounded-2xl border transition-all duration-200 hover:border-white/[0.12]"
      style={{
        background: "#0b0d14",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {isActive && (
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl opacity-40"
          style={{
            background:
              "radial-gradient(ellipse 60% 40% at 30% 0%, rgba(99,102,241,0.15), transparent)",
          }}
        />
      )}

      <div className="relative p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Left */}
          <div className="flex items-start gap-3.5 min-w-0">
            <div
              className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg"
              style={{
                background:
                  "linear-gradient(135deg, rgba(99,102,241,0.18), rgba(139,92,246,0.1))",
                border: "1px solid rgba(99,102,241,0.2)",
                color: "#818cf8",
              }}
            >
              {frameworkIcon}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3
                  className="text-[15px] font-semibold text-white truncate"
                  style={{ fontFamily: "'Sora', sans-serif" }}
                >
                  {project.name}
                </h3>
                {cfg ? (
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${cfg.badge}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                    {cfg.label}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium bg-slate-500/10 text-slate-500 ring-1 ring-slate-500/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-600" />
                    Idle
                  </span>
                )}
              </div>

              <p className="mt-0.5 text-xs text-slate-500 truncate max-w-xs">
                {project.repoUrl.replace("https://github.com/", "⌥ ")}
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span
                  className="rounded-md px-2 py-0.5 text-[11px] font-mono"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    color: "#6b7280",
                  }}
                >
                  {project.framework}
                </span>
                <span
                  className="rounded-md px-2 py-0.5 text-[11px] font-mono"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    color: "#6b7280",
                  }}
                >
                  ⎇ {project.branch}
                </span>
                {deployment?.createdAt && (
                  <span className="text-[11px] text-slate-600">
                    {timeAgo(deployment.createdAt)}
                  </span>
                )}
              </div>

              {status === "running" && deployment?.publicUrl && (
                <a
                  href={deployment.publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  <span>↗</span>
                  <span className="truncate max-w-[220px]">
                    {deployment.publicUrl}
                  </span>
                </a>
              )}
            </div>
          </div>

          {/* Right — actions */}
          <div className="flex items-center gap-2 sm:shrink-0 sm:flex-col sm:items-end lg:flex-row lg:items-center">
            <Link
              href={`/dashboard/projects/${project._id}`}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-slate-400 transition-colors hover:bg-white/[0.05] hover:text-white"
              style={{ border: "1px solid rgba(255,255,255,0.07)" }}
            >
              Details
            </Link>

            {/* View latest deployment logs */}
            {deployment?._id && ( // ← Make sure this is checking the right property
              <Link
                href={`/dashboard/deployments/${deployment._id}`}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-slate-400 transition-colors hover:bg-white/[0.05] hover:text-white"
                style={{ border: "1px solid rgba(255,255,255,0.07)" }}
              >
                Logs
              </Link>
            )}

            <button
              onClick={handleDeploy}
              disabled={deployLoading || !!isActive}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3.5 text-xs font-semibold text-white transition-all hover:scale-[1.03] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
              style={{
                background: deployLoading
                  ? "rgba(16,185,129,0.3)"
                  : "linear-gradient(135deg, #10b981, #059669)",
                boxShadow: deployLoading
                  ? "none"
                  : "0 0 16px rgba(16,185,129,0.25)",
              }}
            >
              {deployLoading ? (
                <>
                  <span className="h-3 w-3 animate-spin rounded-full border border-white/30 border-t-white" />
                  Deploying
                </>
              ) : isActive ? (
                <>
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                  In Progress
                </>
              ) : (
                <>▶ Deploy</>
              )}
            </button>

            <button
              onClick={handleDelete}
              disabled={deleteLoading}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-all hover:scale-[1.03] active:scale-[0.97] disabled:opacity-50"
              style={{
                background: confirmDelete
                  ? "rgba(239,68,68,0.15)"
                  : "transparent",
                border: confirmDelete
                  ? "1px solid rgba(239,68,68,0.4)"
                  : "1px solid rgba(255,255,255,0.07)",
                color: confirmDelete ? "#fca5a5" : "#6b7280",
              }}
            >
              {deleteLoading ? (
                <span className="h-3 w-3 animate-spin rounded-full border border-red-400/30 border-t-red-400" />
              ) : confirmDelete ? (
                "Sure?"
              ) : (
                "Delete"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setError(null);
      const [projectData, deploymentData] = await Promise.all([
        apiRequest<Project[]>("/api/projects"),
        apiRequest<Deployment[]>("/api/projects/deployments"),
      ]);

      // Debug: Log the first deployment to see its structure
      if (deploymentData.length > 0) {
        console.log("Sample deployment:", deploymentData[0]);
        console.log("Deployment ID:", deploymentData[0]._id);
        console.log("ProjectId structure:", deploymentData[0].projectId);
      }

      setProjects(projectData);
      setDeployments(deploymentData);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const deploymentByProject = useMemo(() => {
    const map = new Map<string, Deployment>();

    // Sort deployments by createdAt descending to get the latest first
    const sortedDeployments = [...deployments].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    for (const deployment of sortedDeployments) {
      let projectId: string;

      // Handle different possible structures of projectId
      if (typeof deployment.projectId === "string") {
        projectId = deployment.projectId;
      } else if (
        deployment.projectId &&
        typeof deployment.projectId === "object"
      ) {
        // MongoDB populated result has _id
        projectId = (deployment.projectId as any)._id;
      } else {
        continue;
      }

      // Only set if not already present (this will keep the first/latest due to sorting)
      if (!map.has(projectId)) {
        map.set(projectId, deployment);
      }
    }

    return map;
  }, [deployments]);

  const onDelete = async (projectId: string) => {
    await apiRequest(`/api/projects/${projectId}`, { method: "DELETE" });
    await load();
  };

  /**
   * Trigger a deploy, then immediately navigate to the new deployment's
   * detail page so the user can watch logs in real time.
   */
  const onDeploy = async (projectId: string) => {
    const newDeployment = await apiRequest<Deployment>(
      `/api/projects/${projectId}/deploy`,
      { method: "POST" },
    );
    router.push(`/dashboard/deployments`);
  };

  const liveCount = [...deploymentByProject.values()].filter(
    (d) => d.status === "running",
  ).length;
  const buildingCount = [...deploymentByProject.values()].filter((d) =>
    ["queued", "cloning", "building", "starting"].includes(d.status),
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2
            className="text-[28px] font-bold tracking-tight text-white"
            style={{
              fontFamily: "'Sora', sans-serif",
              letterSpacing: "-0.02em",
            }}
          >
            Projects
          </h2>
          {!loading && projects.length > 0 && (
            <p className="mt-0.5 text-sm text-slate-500">
              {projects.length} project{projects.length !== 1 ? "s" : ""}
              {liveCount > 0 && (
                <span className="ml-2 text-emerald-400">
                  · {liveCount} live
                </span>
              )}
              {buildingCount > 0 && (
                <span className="ml-2 text-blue-400">
                  · {buildingCount} building
                </span>
              )}
            </p>
          )}
        </div>

        <Link
          href="/dashboard/projects/new"
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            boxShadow: "0 0 20px rgba(99,102,241,0.3)",
          }}
        >
          <span className="text-base leading-none">+</span>
          New Project
        </Link>
      </div>

      {error && (
        <div
          className="flex items-center gap-3 rounded-xl p-4 text-sm"
          style={{
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.2)",
            color: "#fca5a5",
          }}
        >
          <span className="shrink-0 text-base">⚠</span>
          <span>{error}</span>
          <button
            onClick={load}
            className="ml-auto shrink-0 rounded-lg px-3 py-1 text-xs font-medium text-red-300 hover:bg-red-500/10 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {projects.map((project) => (
            <ProjectCard
              key={project._id}
              project={project}
              deployment={deploymentByProject.get(project._id)}
              onDeploy={onDeploy}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
