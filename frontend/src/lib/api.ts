export class ApiError extends Error {
  constructor(
    message: string,
    public code?: string,
    public status?: number,
    public fields?: Record<string, string[] | undefined>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const baseUrl = (): string =>
  (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");
const ACCESS_TOKEN_KEY = "shipstack_access_token";

const getStoredAccessToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
};

export const setAccessToken = (token: string | null): void => {
  if (typeof window === "undefined") return;
  if (!token) {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    return;
  }
  window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
};

type ApiSuccess<T> = { success: true; data: T; message?: string };
type ApiFailure = {
  success: false;
  error: string;
  code?: string;
  fields?: Record<string, string[] | undefined>;
};

// ─── Refresh state (prevent parallel refresh storms) ──────────────────────────
let refreshPromise: Promise<string | null> | null = null;

const attemptRefresh = (): Promise<string | null> => {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const url = `${baseUrl()}/api/auth/refresh`;
      const res = await fetch(url, {
        method: "POST",
        credentials: "include", // sends the refresh_token cookie
      });

      if (!res.ok) {
        setAccessToken(null);
        return null;
      }

      const json = (await res.json()) as
        | ApiSuccess<{
            accessToken: string;
          }>
        | ApiFailure;

      if (!json.success) {
        setAccessToken(null);
        return null;
      }

      const newToken = (json as ApiSuccess<{ accessToken: string }>).data
        .accessToken;
      setAccessToken(newToken);
      return newToken;
    } catch {
      setAccessToken(null);
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

// ─── Core request ─────────────────────────────────────────────────────────────
export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
  _retry = true, // internal flag — prevents infinite retry loop
): Promise<T> {
  const url = `${baseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const token = getStoredAccessToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string>),
  };
  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    ...init,
    credentials: "include",
    headers,
  });

  // ── Auto-refresh on 401 ────────────────────────────────────────────────────
  if (res.status === 401 && _retry) {
    const newToken = await attemptRefresh();

    if (!newToken) {
      // Refresh failed — clear state and redirect to login
      setAccessToken(null);
      if (typeof window !== "undefined") {
        window.location.href = "/auth/login";
      }
      throw new ApiError(
        "Session expired. Please sign in again.",
        "SESSION_EXPIRED",
        401,
      );
    }

    // Retry the original request once with the new token
    return apiRequest<T>(path, init, false);
  }

  const json = (await res.json()) as ApiSuccess<T> | ApiFailure;

  if (!res.ok || !json.success) {
    const err = json as ApiFailure;
    throw new ApiError(
      err.error ?? "Request failed",
      err.code,
      res.status,
      err.fields,
    );
  }

  return json.data;
}

export function getOAuthStartUrl(
  provider: "google" | "github",
  redirectToPath = "/auth/callback",
): string {
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_APP_ORIGIN ?? "");
  const redirectTo = `${origin}${redirectToPath.startsWith("/") ? redirectToPath : `/${redirectToPath}`}`;
  const q = new URLSearchParams({ redirectTo });
  return `${baseUrl()}/api/auth/oauth/${provider}?${q}`;
}

/**
 * lib/api.ts  (Phase 5 additions)
 *
 * Adds typed API helpers for all new Phase 5 endpoints.
 * Drop these into the bottom of your existing api.ts.
 */

// ── Keep your existing apiRequest + ApiError at the top of the real file ──
// This file shows only the NEW additions for Phase 5.


// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProjectDetails {
  project: {
    _id: string;
    name: string;
    repoUrl: string;
    framework: string;
    branch: string;
    rootDirectory: string;
    buildCommand: string;
    installCommand: string;
    startCommand: string;
    autoDeploy: boolean;
    trackedBranch: string;
    activeDeploymentId: string | null;
    createdAt: string;
    updatedAt: string;
  };
  latestDeployment: DeploymentSummary | null;
  domains: DomainEntry[];
  envVarsCount: number;
  deploymentCount: number;
}

export interface DeploymentSummary {
  _id: string;
  status: string;
  publicUrl: string | null;
  commitHash: string | null;
  createdAt: string;
  completedAt: string | null;
  healthStatus: "healthy" | "unhealthy" | "unknown";
  triggerSource: "manual" | "webhook" | "rollback" | "redeploy";
  branch: string;
  port: number | null;
  startedAt: string | null;
  errorMessage: string | null;
}

export interface DomainEntry {
  subdomain: string;
  url: string;
  isPrimary: boolean;
  port: number;
}

export interface MaskedEnvVar {
  key: string;
  maskedValue: string;
}

export interface ContainerMetrics {
  available: boolean;
  reason?: string;
  cpuPercent?: number;
  memUsedMb?: number;
  memTotalMb?: number;
  memPercent?: number;
  netInputMb?: number;
  netOutputMb?: number;
  uptime?: string | null;
  error?: string | null;
  lastDeployAt?: string;
  startedAt?: string | null;
}

export interface PaginatedDeployments {
  deployments: DeploymentSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ─── API helpers ──────────────────────────────────────────────────────────────

export const projectApi = {
  getDetails: (projectId: string) =>
    apiRequest<ProjectDetails>(`/api/projects/${projectId}/details`),

  updateSettings: (
    projectId: string,
    settings: Partial<{
      name: string;
      buildCommand: string;
      startCommand: string;
      installCommand: string;
      rootDirectory: string;
      branch: string;
      autoDeploy: boolean;
      trackedBranch: string;
    }>,
  ) =>
    apiRequest<{ _id: string }>(`/api/projects/${projectId}/settings`, {
      method: "PATCH",
      body: JSON.stringify(settings),
    }),

  listDeployments: (projectId: string, page = 1, limit = 20) =>
    apiRequest<PaginatedDeployments>(
      `/api/projects/${projectId}/deployments?page=${page}&limit=${limit}`,
    ),

  redeploy: (projectId: string) =>
    apiRequest<{ deploymentId: string; status: string }>(
      `/api/projects/${projectId}/redeploy`,
      { method: "POST" },
    ),

  rollback: (projectId: string, deploymentId: string) =>
    apiRequest<{ deploymentId: string; status: string }>(
      `/api/projects/${projectId}/rollback/${deploymentId}`,
      { method: "POST" },
    ),

  getMetrics: (projectId: string) =>
    apiRequest<ContainerMetrics>(`/api/projects/${projectId}/metrics`),

  getDomains: (projectId: string) =>
    apiRequest<{ defaultDomain: DomainEntry | null }>(
      `/api/projects/${projectId}/domains`,
    ),

  deleteProject: (projectId: string) =>
    apiRequest<null>(`/api/projects/${projectId}`, { method: "DELETE" }),

  stopActiveDeployment: (deploymentId: string) =>
    apiRequest<{ status: string }>(
      `/api/projects/deployments/${deploymentId}/stop`,
      { method: "POST" },
    ),
};

export const envApi = {
  list: (projectId: string) =>
    apiRequest<MaskedEnvVar[]>(`/api/projects/${projectId}/env`),

  add: (projectId: string, key: string, value: string) =>
    apiRequest<MaskedEnvVar[]>(`/api/projects/${projectId}/env`, {
      method: "POST",
      body: JSON.stringify({ key, value }),
    }),

  update: (projectId: string, key: string, value: string) =>
    apiRequest<MaskedEnvVar[]>(`/api/projects/${projectId}/env/${encodeURIComponent(key)}`, {
      method: "PATCH",
      body: JSON.stringify({ value }),
    }),

  delete: (projectId: string, key: string) =>
    apiRequest<MaskedEnvVar[]>(
      `/api/projects/${projectId}/env/${encodeURIComponent(key)}`,
      { method: "DELETE" },
    ),
};
