"use client";

import { useEffect, useState } from "react";
import { apiRequest, ApiError } from "@/lib/api";
import type { Deployment } from "@/lib/types/dashboard";

export default function DeploymentsPage() {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiRequest<Deployment[]>("/api/projects/deployments")
      .then(setDeployments)
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : "Failed to load deployments"),
      );
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
      <div className="rounded-2xl border border-white/10 bg-[#0e1422] p-4">
        {deployments.length === 0 ? (
          <p className="text-sm text-slate-300">No deployments yet.</p>
        ) : (
          <div className="space-y-2">
            {deployments.map((item) => (
              <div
                key={item._id}
                className="rounded-lg border border-white/10 bg-[#101a2d] px-4 py-3"
              >
                <p className="text-sm text-white">Project: {item.projectId}</p>
                <p className="text-xs text-slate-400">
                  Status: <span className="capitalize">{item.status}</span>
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
