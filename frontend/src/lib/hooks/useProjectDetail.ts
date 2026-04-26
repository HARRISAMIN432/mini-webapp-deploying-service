/**
 * lib/hooks/useProjectDetail.ts  (Phase 5)
 *
 * React hook that wraps the project details endpoint.
 * Provides:
 *  - Polling (every 8s) while a deployment is active
 *  - Manual refresh
 *  - Loading / error states
 *
 * Used by ProjectDetailClient to keep status badges live without SSE.
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { projectApi, ApiError } from "@/lib/api";
import type { ProjectDetails } from "@/lib/api";

const ACTIVE_STATUSES = new Set(["queued", "cloning", "building", "starting"]);
const POLL_INTERVAL_ACTIVE_MS = 4_000;
const POLL_INTERVAL_IDLE_MS = 15_000;

interface UseProjectDetailResult {
  details: ProjectDetails | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useProjectDetail(
  projectId: string,
  initial: ProjectDetails,
): UseProjectDetailResult {
  const [details, setDetails] = useState<ProjectDetails | null>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetch = useCallback(async () => {
    try {
      const data = await projectApi.getDetails(projectId);
      setDetails(data);
      setError(null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        setError("Project not found");
        setDetails(null);
      }
      // Silently ignore network errors during polling — don't flash error state
    }
  }, [projectId]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await fetch();
    setLoading(false);
  }, [fetch]);

  // Adaptive polling: faster when a deployment is in-flight
  useEffect(() => {
    // Check if details exists and has a latestDeployment
    const isActive = details?.latestDeployment?.status
      ? ACTIVE_STATUSES.has(details.latestDeployment.status)
      : false;

    const interval = isActive ? POLL_INTERVAL_ACTIVE_MS : POLL_INTERVAL_IDLE_MS;

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(fetch, interval);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [details?.latestDeployment?.status, fetch]);

  return { details, loading, error, refresh };
}
