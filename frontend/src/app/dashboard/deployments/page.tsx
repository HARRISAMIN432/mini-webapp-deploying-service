"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiRequest, ApiError } from "@/lib/api";
import type { Deployment, DeploymentStatus } from "@/lib/types/dashboard";

const statusTone: Record<DeploymentStatus, string> = {
  queued: "bg-amber-500/15 text-amber-300",
  cloning: "bg-cyan-500/15 text-cyan-300",
  building: "bg-blue-500/15 text-blue-300",
  starting: "bg-violet-500/15 text-violet-300",
  running: "bg-emerald-500/15 text-emerald-300",
  failed: "bg-red-500/15 text-red-300",
  stopped: "bg-slate-500/15 text-slate-300",
};

export default function DeploymentsPage() {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = () =>
      apiRequest<Deployment[]>("/api/projects/deployments")
        .then(setDeployments)
        .catch((e) =>
          setError(
            e instanceof ApiError ? e.message : "Failed to load deployments",
          ),
        );
    load();
    const id = setInterval(load, 4000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-5">
      <h2
        className="text-3xl font-bold text-white"
        style={{ fontFamily: "'Sora', sans-serif" }}
      >
        Deployments
      </h2>
      {error && (
        <div className="rounded-xl border border-red-500/35 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </div>
      )}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0e1422]">
        {deployments.length === 0 ? (
          <p className="p-4 text-sm text-slate-300">No deployments yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[740px] text-sm">
              <thead className="border-b border-white/10 bg-[#111a2e] text-left text-xs uppercase tracking-[0.1em] text-slate-400">
                <tr>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Public URL</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
            {deployments.map((item) => (
              <tr
                key={item._id}
                className="border-b border-white/5 bg-[#0e1422] last:border-b-0"
              >
                <td className="px-4 py-3 text-white">
                  {typeof item.projectId === "string"
                    ? item.projectId
                    : item.projectId.name}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs capitalize ${statusTone[item.status]}`}
                  >
                    {item.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-300">
                  {new Date(item.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-slate-300">
                  {item.publicUrl ? (
                    <a
                      href={item.publicUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-300 hover:text-indigo-200"
                    >
                      {item.publicUrl}
                    </a>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/dashboard/deployments/${item._id}`}
                    className="rounded-md border border-white/15 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/5"
                  >
                    View
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
