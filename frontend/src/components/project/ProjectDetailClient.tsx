"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { projectApi, ApiError } from "@/lib/api";
import { useProjectDetail } from "@/lib/hooks/useProjectDetail";
import type {
  ProjectDetails,
  PaginatedDeployments,
  MaskedEnvVar,
} from "@/lib/api";
import { EnvTable } from "./EnvTable";
import { DeploymentHistory } from "./DeploymentHistory";
import { MetricsCards } from "./MetricsCards";
import { ProjectDangerZone } from "./ProjectDangerZone";
import { ProjectSettingsPanel } from "./ProjectSettingsPanel";

type Tab =
  | "overview"
  | "deployments"
  | "env"
  | "domains"
  | "metrics"
  | "settings"
  | "danger";

interface Props {
  projectId: string;
  initialDetails: ProjectDetails;
  initialDeployments: PaginatedDeployments;
  initialEnvVars: MaskedEnvVar[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { bg: string; dot: string; text: string }> = {
  running: { bg: "bg-green-50", dot: "bg-green-500", text: "text-green-700" },
  queued: { bg: "bg-amber-50", dot: "bg-amber-400", text: "text-amber-700" },
  cloning: { bg: "bg-blue-50", dot: "bg-blue-400", text: "text-blue-700" },
  building: {
    bg: "bg-violet-50",
    dot: "bg-violet-500",
    text: "text-violet-700",
  },
  starting: { bg: "bg-cyan-50", dot: "bg-cyan-500", text: "text-cyan-700" },
  stopped: { bg: "bg-gray-100", dot: "bg-gray-400", text: "text-gray-600" },
  failed: { bg: "bg-red-50", dot: "bg-red-500", text: "text-red-700" },
};

const HEALTH_CFG: Record<string, { dot: string; label: string }> = {
  healthy: { dot: "bg-green-500", label: "Healthy" },
  unhealthy: { dot: "bg-red-500", label: "Unhealthy" },
  unknown: { dot: "bg-gray-400", label: "Checking" },
};

const TRIGGER_LABELS: Record<string, string> = {
  manual: "Manual",
  webhook: "GitHub Push",
  rollback: "Rollback",
  redeploy: "Redeploy",
};

const ACTIVE = new Set(["queued", "cloning", "building", "starting"]);

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.stopped;
  const pulse = ACTIVE.has(status);
  const labels: Record<string, string> = {
    running: "Live",
    queued: "Queued",
    cloning: "Cloning",
    building: "Building",
    starting: "Starting",
    stopped: "Stopped",
    failed: "Failed",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot} ${pulse ? "animate-pulse" : ""}`}
      />
      {labels[status] ?? status}
    </span>
  );
}

function timeAgo(dateStr?: string | null): string {
  if (!dateStr) return "—";
  const ms = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function Toast({ msg, type }: { msg: string; type: "ok" | "err" }) {
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm shadow-xl animate-in slide-in-from-bottom-2 ${
        type === "ok"
          ? "border-green-200 bg-white text-green-700 shadow-green-100"
          : "border-red-200 bg-white text-red-700 shadow-red-100"
      }`}
    >
      <span
        className={`w-2 h-2 rounded-full flex-shrink-0 ${type === "ok" ? "bg-green-500" : "bg-red-500"}`}
      />
      {msg}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-4 py-3.5">
      <p className="text-xs text-gray-500 font-medium mb-1">{label}</p>
      <p className="text-lg font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function frameworkIcon(fw: string): string {
  const f = fw.toLowerCase();
  if (f.includes("next")) return "▲";
  if (f.includes("vite") || f.includes("react")) return "⚡";
  if (f.includes("python") || f.includes("flask") || f.includes("django"))
    return "🐍";
  if (f.includes("node") || f.includes("express")) return "⬡";
  return "◈";
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ProjectDetailClient({
  projectId,
  initialDetails,
  initialDeployments,
  initialEnvVars,
}: Props) {
  const router = useRouter();
  const { details, refresh } = useProjectDetail(projectId, initialDetails);
  const [tab, setTab] = useState<Tab>("overview");
  const [deploying, setDeploying] = useState(false);
  const [toast, setToast] = useState<{
    msg: string;
    type: "ok" | "err";
  } | null>(null);

  if (!details) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-gray-200 border-t-violet-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading project…</p>
        </div>
      </div>
    );
  }

  const { project, latestDeployment, domains, envVarsCount } = details;

  const fire = (msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleRedeploy = useCallback(async () => {
    setDeploying(true);
    try {
      const dep = await projectApi.redeploy(projectId);
      fire("Redeployment queued");
      setTimeout(
        () => router.push(`/dashboard/deployments/${dep.deploymentId}`),
        700,
      );
    } catch (e) {
      fire(e instanceof ApiError ? e.message : "Redeploy failed", "err");
    } finally {
      setDeploying(false);
    }
  }, [projectId, router]);

  const TABS: {
    id: Tab;
    label: string;
    badge?: number | string;
    danger?: boolean;
  }[] = [
    { id: "overview", label: "Overview" },
    {
      id: "deployments",
      label: "Deployments",
      badge: details?.deploymentCount,
    },
    { id: "env", label: "Env Vars", badge: envVarsCount },
    { id: "domains", label: "Domains" },
    { id: "metrics", label: "Metrics" },
    { id: "settings", label: "Settings" },
    { id: "danger", label: "Danger Zone", danger: true },
  ];

  const health =
    HEALTH_CFG[latestDeployment?.healthStatus ?? "unknown"] ??
    HEALTH_CFG.unknown;
  const isRunning = latestDeployment?.status === "running";

  return (
    <div className="p-8 max-w-5xl">
      {toast && <Toast {...toast} />}

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 mb-6 text-sm">
        <button
          onClick={() => router.push("/dashboard/projects")}
          className="text-gray-400 hover:text-gray-700 transition-colors font-medium"
        >
          Projects
        </button>
        <span className="text-gray-300">/</span>
        <span className="text-gray-900 font-medium">{project.name}</span>
      </nav>

      {/* Header card */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-3.5">
            {/* Framework icon */}
            <div className="w-10 h-10 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center text-lg flex-shrink-0">
              {frameworkIcon(project.framework)}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-base font-semibold text-gray-900">
                  {project.name}
                </h1>
                {latestDeployment && (
                  <StatusBadge status={latestDeployment.status} />
                )}
                {isRunning && (
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <span
                      className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${health.dot}`}
                    />
                    {health.label}
                  </span>
                )}
              </div>
              <a
                href={project.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-0.5 text-xs text-gray-400 hover:text-violet-600 transition-colors font-mono block truncate max-w-xs"
              >
                {project.repoUrl.replace("https://github.com/", "⎇ ")}
              </a>
              <div className="flex flex-wrap items-center gap-2.5 mt-1.5">
                <span className="text-xs text-gray-400">
                  {project.framework}
                </span>
                <span className="text-gray-200">·</span>
                <span className="text-xs text-gray-400 font-mono">
                  {project.branch}
                </span>
                {latestDeployment?.commitHash && (
                  <>
                    <span className="text-gray-200">·</span>
                    <span className="text-xs font-mono text-gray-400">
                      {latestDeployment.commitHash.slice(0, 7)}
                    </span>
                  </>
                )}
                <span className="text-gray-200">·</span>
                <span className="text-xs text-gray-400">
                  Created {timeAgo(project.createdAt)}
                </span>
                {project.autoDeploy && (
                  <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
                    <span className="w-1 h-1 rounded-full bg-green-500" />{" "}
                    Auto-deploy
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {domains[0]?.url && (
              <a
                href={domains[0].url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-900 transition-all"
              >
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                Open App
              </a>
            )}
            <button
              onClick={handleRedeploy}
              disabled={deploying}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-gray-900 hover:bg-gray-700 text-white transition-all disabled:opacity-60"
            >
              {deploying ? (
                <>
                  <span className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />
                  Queuing…
                </>
              ) : (
                <>
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <polyline points="23 4 23 10 17 10" />
                    <polyline points="1 20 1 14 7 14" />
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                  </svg>
                  Redeploy
                </>
              )}
            </button>
          </div>
        </div>

        {/* Live URL bar */}
        {domains[0]?.url && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-3 flex-wrap">
            <span className="text-xs text-gray-400 font-medium">Live at</span>
            <a
              href={domains[0].url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono text-violet-600 hover:text-violet-700 transition-colors"
            >
              {domains[0].url}
            </a>
            <button
              onClick={() => {
                navigator.clipboard.writeText(domains[0].url);
                fire("URL copied");
              }}
              className="text-xs px-2 py-0.5 rounded-md border border-gray-200 text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-all"
            >
              Copy
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0.5 overflow-x-auto mb-5 border-b border-gray-200 scrollbar-hide">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-all -mb-px ${
                active
                  ? t.danger
                    ? "border-red-500 text-red-600"
                    : "border-gray-900 text-gray-900"
                  : t.danger
                    ? "border-transparent text-red-400 hover:text-red-600"
                    : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              {t.label}
              {t.badge !== undefined && Number(t.badge) > 0 && (
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                    active
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ─── OVERVIEW ─────────────────────────────────────────────────────── */}
      {tab === "overview" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              label="Total Deploys"
              value={String(details?.deploymentCount)}
            />
            <StatCard label="Env Vars" value={String(envVarsCount)} />
            <StatCard
              label="Last Deploy"
              value={timeAgo(latestDeployment?.createdAt)}
            />
            <StatCard
              label="Framework"
              value={project.framework.split(" ")[0]}
              sub={`branch: ${project.branch}`}
            />
          </div>

          {latestDeployment ? (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-900">
                  Latest Deployment
                </h2>
                <StatusBadge status={latestDeployment.status} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4 text-sm">
                {[
                  {
                    l: "Commit",
                    v: latestDeployment.commitHash?.slice(0, 7) ?? "—",
                    mono: true,
                  },
                  { l: "Branch", v: latestDeployment.branch, mono: true },
                  {
                    l: "Trigger",
                    v:
                      TRIGGER_LABELS[latestDeployment.triggerSource] ??
                      latestDeployment.triggerSource,
                  },
                  { l: "Started", v: timeAgo(latestDeployment.startedAt) },
                  { l: "Health", v: health.label },
                  {
                    l: "Duration",
                    v: (() => {
                      if (
                        !latestDeployment.startedAt ||
                        !latestDeployment.completedAt
                      )
                        return "—";
                      const s = Math.floor(
                        (new Date(latestDeployment.completedAt).getTime() -
                          new Date(latestDeployment.startedAt).getTime()) /
                          1000,
                      );
                      return s < 60
                        ? `${s}s`
                        : `${Math.floor(s / 60)}m ${s % 60}s`;
                    })(),
                  },
                ].map((row) => (
                  <div key={row.l}>
                    <p className="text-xs text-gray-400 mb-1">{row.l}</p>
                    <p
                      className={`text-sm text-gray-800 ${row.mono ? "font-mono" : "font-medium"}`}
                    >
                      {row.v}
                    </p>
                  </div>
                ))}
              </div>
              {latestDeployment.errorMessage && (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700 font-mono break-all">
                  {latestDeployment.errorMessage}
                </div>
              )}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <button
                  onClick={() =>
                    router.push(
                      `/dashboard/deployments/${latestDeployment._id}`,
                    )
                  }
                  className="text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors"
                >
                  View Logs →
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl px-5 py-14 text-center">
              <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-200 mx-auto mb-4 flex items-center justify-center text-2xl">
                🚀
              </div>
              <p className="text-sm font-medium text-gray-700 mb-1">
                No deployments yet
              </p>
              <p className="text-xs text-gray-400 mb-4">
                Push your first deployment to get started
              </p>
              <button
                onClick={handleRedeploy}
                disabled={deploying}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-gray-900 hover:bg-gray-700 text-white transition-all disabled:opacity-60"
              >
                Deploy Now
              </button>
            </div>
          )}

          {/* Build config */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">
              Build Configuration
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { l: "Install", v: project.installCommand },
                { l: "Build", v: project.buildCommand },
                { l: "Root Dir", v: project.rootDirectory },
              ].map((c) => (
                <div
                  key={c.l}
                  className="bg-gray-50 border border-gray-100 rounded-lg px-3.5 py-2.5"
                >
                  <p className="text-xs text-gray-400 mb-1">{c.l}</p>
                  <p className="text-xs font-mono text-gray-700 truncate">
                    {c.v}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── DEPLOYMENTS ──────────────────────────────────────────────────── */}
      {tab === "deployments" && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">
              Deployment History
            </h2>
          </div>
          <div className="p-5">
            <DeploymentHistory
              projectId={projectId}
              initialData={initialDeployments}
              onRollback={refresh}
            />
          </div>
        </div>
      )}

      {/* ─── ENV VARS ─────────────────────────────────────────────────────── */}
      {tab === "env" && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                Environment Variables
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Values are masked — never returned in plaintext via the API.
              </p>
            </div>
          </div>
          <div className="p-5">
            <EnvTable
              projectId={projectId}
              initialVars={initialEnvVars}
              onChanged={refresh}
            />
            <div className="mt-4 pt-4 border-t border-gray-100">
              <button
                onClick={handleRedeploy}
                disabled={deploying}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-gray-900 hover:bg-gray-700 text-white transition-all disabled:opacity-60"
              >
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <polyline points="23 4 23 10 17 10" />
                  <polyline points="1 20 1 14 7 14" />
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                </svg>
                {deploying ? "Queuing…" : "Redeploy to Apply"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── DOMAINS ──────────────────────────────────────────────────────── */}
      {tab === "domains" && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">
                Active Domains
              </h2>
            </div>
            <div className="p-5">
              {domains.length === 0 ? (
                <div className="py-10 text-center">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-200 mx-auto mb-3 flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <circle
                        cx="8"
                        cy="8"
                        r="6.5"
                        stroke="#D1D5DB"
                        strokeWidth="1.5"
                      />
                      <path
                        d="M8 1.5C8 1.5 5.5 4.5 5.5 8C5.5 11.5 8 14.5 8 14.5"
                        stroke="#D1D5DB"
                        strokeWidth="1.5"
                      />
                      <path
                        d="M8 1.5C8 1.5 10.5 4.5 10.5 8C10.5 11.5 8 14.5 8 14.5"
                        stroke="#D1D5DB"
                        strokeWidth="1.5"
                      />
                      <path
                        d="M1.5 8H14.5"
                        stroke="#D1D5DB"
                        strokeWidth="1.5"
                      />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-500">
                    No domain assigned yet
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Deploy the project to receive a subdomain.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {domains.map((d: any) => (
                    <div
                      key={d.subdomain}
                      className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl px-4 py-3.5 gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${isRunning ? "bg-green-500 animate-pulse" : "bg-gray-300"}`}
                        />
                        <div className="min-w-0">
                          <a
                            href={d.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-mono text-violet-600 hover:text-violet-700 transition-colors block truncate"
                          >
                            {d.url}
                          </a>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {d.isPrimary ? "Primary · auto-assigned" : "Custom"}{" "}
                            · port {d.port}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(d.url);
                            fire("URL copied");
                          }}
                          className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-all"
                        >
                          Copy
                        </button>
                        <a
                          href={d.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-500 hover:text-violet-600 hover:border-violet-200 transition-all"
                        >
                          Open ↗
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-2">
              How subdomains work
            </h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              ShipStack assigns{" "}
              <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 font-mono">
                {project.name.toLowerCase().replace(/\s+/g, "-")}.localhost
              </code>{" "}
              via nginx reverse proxy. Rename your project in Settings to change
              the subdomain. Custom domain support (DNS + TLS) is planned for a
              future release.
            </p>
          </div>
        </div>
      )}

      {/* ─── METRICS ──────────────────────────────────────────────────────── */}
      {tab === "metrics" && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                Runtime Metrics
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Live from Docker stats — auto-refreshes every 30s
              </p>
            </div>
            {isRunning && (
              <span className="inline-flex items-center gap-1.5 text-xs text-green-600 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Live
              </span>
            )}
          </div>
          <div className="p-5">
            <MetricsCards
              projectId={projectId}
              lastDeployAt={latestDeployment?.createdAt}
            />
          </div>
        </div>
      )}

      {/* ─── SETTINGS ─────────────────────────────────────────────────────── */}
      {tab === "settings" && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">
              Project Settings
            </h2>
          </div>
          <div className="p-5">
            <ProjectSettingsPanel
              projectId={projectId}
              initial={{
                name: project.name,
                buildCommand: project.buildCommand,
                installCommand: project.installCommand,
                startCommand: project.startCommand ?? "",
                rootDirectory: project.rootDirectory,
                branch: project.branch,
                autoDeploy: project.autoDeploy,
                trackedBranch: project.trackedBranch ?? "main",
              }}
              onSaved={refresh}
            />
          </div>
        </div>
      )}

      {/* ─── DANGER ZONE ──────────────────────────────────────────────────── */}
      {tab === "danger" && (
        <ProjectDangerZone
          projectId={projectId}
          projectName={project.name}
          activeDeploymentId={isRunning ? latestDeployment!._id : null}
        />
      )}

      <style
        dangerouslySetInnerHTML={{
          __html: `.scrollbar-hide::-webkit-scrollbar{display:none}.scrollbar-hide{-ms-overflow-style:none;scrollbar-width:none}`,
        }}
      />
    </div>
  );
}
