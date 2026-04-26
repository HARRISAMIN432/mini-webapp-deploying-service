// app/dashboard/projects/[id]/page.tsx
"use client"; // ← Add this

import { useEffect, useState } from "react";
import { notFound, useRouter } from "next/navigation";
import { ProjectDetailClient } from "@/components/project/ProjectDetailClient";
import { apiRequest, ApiError } from "@/lib/api";
import type {
  ProjectDetails,
  PaginatedDeployments,
  MaskedEnvVar,
} from "@/lib/api";
import React from "react";

interface PageProps {
  params: Promise<{ id: string }>; // ← Change to Promise
}

export default function ProjectDetailPage({ params }: PageProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<ProjectDetails | null>(null);
  const [deployments, setDeployments] = useState<PaginatedDeployments | null>(
    null,
  );
  const [envVars, setEnvVars] = useState<MaskedEnvVar[]>([]);

  // ← Unwrap params with React.use()
  const { id } = React.use(params);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        const [detailsData, deploymentsData, envVarsData] = await Promise.all([
          apiRequest<ProjectDetails>(`/api/projects/${id}/details`), // ← Use id instead of params.id
          apiRequest<PaginatedDeployments>(
            `/api/projects/${id}/deployments?limit=20`, // ← Use id instead of params.id
          ),
          apiRequest<MaskedEnvVar[]>(`/api/projects/${id}/env`), // ← Use id instead of params.id
        ]);

        setDetails(detailsData);
        setDeployments(deploymentsData);
        setEnvVars(envVarsData);
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.status === 404) {
            notFound();
          } else if (err.status === 401) {
            router.push("/auth/login");
          } else {
            setError(err.message);
          }
        } else {
          setError("Failed to load project details");
        }
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id, router]); // ← Use id in dependency array instead of params.id

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading project details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 mb-4">⚠️ {error}</div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-indigo-600 rounded-lg text-white"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!details || !deployments) {
    return notFound();
  }

  return (
    <ProjectDetailClient
      projectId={id} // ← Use id instead of params.id
      initialDetails={details}
      initialDeployments={deployments}
      initialEnvVars={envVars}
    />
  );
}
