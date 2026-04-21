"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiRequest, ApiError } from "@/lib/api";
import type { Deployment, DeploymentStatus, Project } from "@/lib/types/dashboard";

const statusTone: Record<DeploymentStatus, string> = {
  queued: "bg-amber-500/15 text-amber-300 border border-amber-400/20",
  building: "bg-blue-500/15 text-blue-300 border border-blue-400/20",
  running: "bg-emerald-500/15 text-emerald-300 border border-emerald-400/20",
  failed: "bg-red-500/15 text-red-300 border border-red-400/20",
};

export default function ProjectsPage() {
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
    for (const deployment of deployments) {
      if (!map.has(deployment.projectId)) map.set(deployment.projectId, deployment);
    }
    return map;
  }, [deployments]);

  const onDelete = async (projectId: string) => {
    try {
      await apiRequest(`/api/projects/${projectId}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Unable to delete project");
    }
  };

  const onDeploy = async (projectId: string) => {
    try {
      await apiRequest(`/api/projects/${projectId}/deploy`, { method: "POST" });
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Unable to start deployment");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2
          className="text-3xl font-bold text-white"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          Projects
        </h2>
        <Link
          href="/dashboard/projects/new"
          className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400"
        >
          New
        </Link>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/35 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-300">Loading projects...</p>
      ) : projects.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[#0e1422] p-6 text-slate-300">
          No projects yet. Create your first one.
        </div>
      ) : (
        <div className="grid gap-3">
          {projects.map((project) => {
            const deployment = deploymentByProject.get(project._id);
            return (
              <div
                key={project._id}
                className="rounded-2xl border border-white/10 bg-[#0e1422] p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{project.name}</h3>
                    <p className="text-sm text-slate-400">{project.repoUrl}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {project.framework} | {project.branch}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${deployment ? statusTone[deployment.status] : "border border-slate-500/30 bg-slate-500/10 text-slate-300"}`}
                    >
                      {deployment?.status ?? "idle"}
                    </span>
                    <button
                      onClick={() => onDelete(project._id)}
                      className="rounded-md border border-red-500/40 px-3 py-1.5 text-xs text-red-200 hover:bg-red-500/10"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => onDeploy(project._id)}
                      className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500"
                    >
                      Deploy
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
