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

// ─── Status badge (consistent with dashboard) ─────────────────────────────────

function StatusBadge({ status }: { status: DeploymentStatus | null }) {
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
    building: {
      dot: "bg-amber-400",
      bg: "bg-amber-50",
      text: "text-amber-700",
      label: "Building",
    },
    starting: {
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

  const s = map[status ?? "stopped"] ?? {
    dot: "bg-gray-400",
    bg: "bg-gray-100",
    text: "text-gray-600",
    label: status ?? "Unknown",
  };

  const isActive =
    status && ["queued", "cloning", "building", "starting"].includes(status);

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.bg} ${s.text}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${s.dot} ${isActive ? "animate-pulse" : ""}`}
      />
      {s.label}
    </span>
  );
}

// ─── Stat card (consistent with dashboard) ────────────────────────────────────

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

// ─── Project Card ─────────────────────────────────────────────────────────────

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
  const isActive =
    status && ["queued", "cloning", "building", "starting"].includes(status);
  const frameworkIcon = getFrameworkIcon(project.framework);

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
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-sm transition-all">
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          {/* Left - Project info */}
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center text-lg flex-shrink-0">
              {frameworkIcon}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-gray-900">
                  {project.name}
                </h3>
                {status ? (
                  <StatusBadge status={status} />
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                    Idle
                  </span>
                )}
              </div>

              <p className="text-xs text-gray-500 mt-0.5 truncate">
                {project.repoUrl.replace("https://github.com/", "")}
              </p>

              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="text-xs text-gray-400 font-mono">
                  {project.framework}
                </span>
                <span className="text-xs text-gray-400">·</span>
                <span className="text-xs text-gray-400 font-mono">
                  {project.branch}
                </span>
                {deployment?.createdAt && (
                  <>
                    <span className="text-xs text-gray-400">·</span>
                    <span className="text-xs text-gray-400">
                      {relativeTime(deployment.createdAt)}
                    </span>
                  </>
                )}
              </div>

              {status === "running" && deployment?.publicUrl && (
                <a
                  href={deployment.publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-violet-600 hover:text-violet-700 mt-2"
                >
                  <span>↗</span>
                  <span className="truncate max-w-[220px]">
                    {deployment.publicUrl}
                  </span>
                </a>
              )}
            </div>
          </div>

          {/* Right - Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              href={`/dashboard/projects/${project._id}`}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Details
            </Link>

            {deployment?._id && (
              <Link
                href={`/dashboard/deployments/${deployment._id}`}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Logs
              </Link>
            )}

            <button
              onClick={handleDeploy}
              disabled={deployLoading || !!isActive}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deployLoading ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Deploying
                </span>
              ) : isActive ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                  In Progress
                </span>
              ) : (
                "Deploy"
              )}
            </button>

            <button
              onClick={handleDelete}
              disabled={deleteLoading}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                confirmDelete
                  ? "bg-red-50 text-red-600 hover:bg-red-100"
                  : "text-gray-400 hover:text-red-600 hover:bg-red-50"
              }`}
            >
              {deleteLoading ? (
                <span className="w-3 h-3 border-2 border-red-400 border-t-red-600 rounded-full animate-spin" />
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

// ─── Helper functions ─────────────────────────────────────────────────────────

function getFrameworkIcon(framework: string): string {
  const icons: Record<string, string> = {
    "Next.js": "▲",
    React: "⚛️",
    Vue: "◈",
    Nuxt: "◈",
    Svelte: "◆",
    Remix: "◎",
    Astro: "◉",
  };
  return icons[framework] ?? "◇";
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center text-3xl mb-5">
        ⬡
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        No projects yet
      </h3>
      <p className="text-sm text-gray-500 max-w-xs mb-6">
        Connect a repository and deploy your first project in under a minute.
      </p>
      <Link
        href="/dashboard/projects/new"
        className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-gray-900 hover:bg-gray-800 rounded-xl transition-all"
      >
        <span>+</span> New Project
      </Link>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <div className="w-10 h-10 rounded-lg bg-gray-100" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-36 bg-gray-100 rounded" />
            <div className="h-3 w-52 bg-gray-100 rounded" />
            <div className="h-3 w-32 bg-gray-100 rounded" />
          </div>
        </div>
        <div className="h-8 w-20 bg-gray-100 rounded-lg" />
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
    const sortedDeployments = [...deployments].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    for (const deployment of sortedDeployments) {
      let projectId: string;
      if (typeof deployment.projectId === "string") {
        projectId = deployment.projectId;
      } else if (
        deployment.projectId &&
        typeof deployment.projectId === "object"
      ) {
        projectId = (deployment.projectId as any)._id;
      } else {
        continue;
      }
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

  const onDeploy = async (projectId: string) => {
    await apiRequest(`/api/projects/${projectId}/deploy`, { method: "POST" });
    router.push("/dashboard/deployments");
  };

  // Calculate stats
  const liveCount = [...deploymentByProject.values()].filter(
    (d) => d.status === "running",
  ).length;
  const buildingCount = [...deploymentByProject.values()].filter((d) =>
    ["queued", "cloning", "building", "starting"].includes(d.status),
  ).length;

  const stats = [
    {
      label: "Total projects",
      value: String(projects.length),
      sub: `${liveCount} live · ${buildingCount} building`,
      subPositive: true,
    },
    {
      label: "Deployments",
      value: String(deployments.length),
      sub: "All time",
    },
    {
      label: "Success rate",
      value: deployments.length
        ? `${Math.round((deployments.filter((d) => d.status === "running").length / deployments.length) * 100)}%`
        : "—",
    },
    {
      label: "Active builds",
      value: String(buildingCount),
      sub: buildingCount > 0 ? "In progress" : "None",
      subPositive: buildingCount === 0,
    },
  ];

  return (
    <div className="p-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Projects</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage and monitor all your deployed projects
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
          New Project
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <span className="text-red-500">⚠️</span>
            <span className="text-sm text-red-700">{error}</span>
            <button
              onClick={load}
              className="ml-auto text-sm text-red-600 hover:text-red-800 font-medium"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Projects List */}
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
