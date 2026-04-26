"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { projectApi } from "@/lib/api";

interface ProjectDangerZoneProps {
  projectId: string;
  projectName: string;
  activeDeploymentId: string | null;
}

export function ProjectDangerZone({
  projectId,
  projectName,
  activeDeploymentId,
}: ProjectDangerZoneProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStop = async () => {
    if (!activeDeploymentId) return;
    if (!confirm("Stop the running app? You can redeploy at any time.")) return;
    setStopping(true);
    try {
      await projectApi.stopActiveDeployment(activeDeploymentId);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to stop");
    } finally {
      setStopping(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirm !== projectName) {
      setError("Project name does not match");
      return;
    }
    setDeleting(true);
    try {
      await projectApi.deleteProject(projectId);
      router.push("/dashboard/projects");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete project");
      setDeleting(false);
    }
  };

  return (
    <div className="rounded-xl border border-red-500/20 bg-red-500/4 overflow-hidden">
      <div className="px-5 py-4 border-b border-red-500/15">
        <div className="flex items-center gap-2">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ef4444"
            strokeWidth="2"
          >
            <path d="m10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <h3 className="text-sm font-semibold text-red-400">Danger Zone</h3>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/8 px-3 py-2.5 text-xs text-red-300">
            {error}
          </div>
        )}

        {/* Stop app */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-300">
              Stop application
            </p>
            <p className="text-xs text-slate-600 mt-0.5">
              Stops the running Docker container. You can redeploy at any time.
            </p>
          </div>
          <button
            onClick={handleStop}
            disabled={!activeDeploymentId || stopping}
            className="flex-shrink-0 px-4 py-2 text-xs font-semibold rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {stopping ? "Stopping…" : "Stop App"}
          </button>
        </div>

        <div className="border-t border-red-500/10" />

        {/* Delete project */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-300">Delete project</p>
            <p className="text-xs text-slate-600 mt-0.5">
              Permanently deletes this project, all deployments, logs, and nginx
              routes.
            </p>
          </div>
          <button
            onClick={() => setShowDeleteDialog(true)}
            className="flex-shrink-0 px-4 py-2 text-xs font-semibold rounded-xl bg-red-600 hover:bg-red-500 text-white transition-all"
          >
            Delete Project
          </button>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md mx-4 bg-[#0a1020] border border-[#1a2540] rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="2"
                >
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6M14 11v6" />
                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
              </div>
              <h2 className="text-base font-bold text-white">Delete project</h2>
            </div>

            <p className="text-sm text-slate-400 mb-1">
              This action{" "}
              <span className="text-red-400 font-semibold">
                cannot be undone
              </span>
              . This will permanently delete:
            </p>
            <ul className="text-xs text-slate-500 mb-4 ml-4 list-disc space-y-0.5">
              <li>All deployments and logs</li>
              <li>All environment variables</li>
              <li>The nginx subdomain route</li>
              <li>All running containers</li>
            </ul>

            <p className="text-xs text-slate-500 mb-2">
              Type{" "}
              <span className="font-mono text-white bg-[#111c30] px-1.5 py-0.5 rounded">
                {projectName}
              </span>{" "}
              to confirm:
            </p>
            <input
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleDelete()}
              placeholder={projectName}
              className="w-full bg-[#060d1a] border border-[#1e293b] rounded-xl px-3.5 py-2.5 text-sm font-mono text-white outline-none focus:border-red-500/50 focus:ring-2 focus:ring-red-500/10 transition-all placeholder:text-slate-700 mb-4"
            />

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowDeleteDialog(false);
                  setDeleteConfirm("");
                  setError(null);
                }}
                className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-[#1e293b] text-slate-500 hover:text-slate-300 hover:border-slate-600 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting || deleteConfirm !== projectName}
                className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl bg-red-600 hover:bg-red-500 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {deleting ? "Deleting…" : "Delete Forever"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
