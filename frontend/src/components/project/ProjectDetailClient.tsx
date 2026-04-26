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

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { ring: string; text: string; dot: string }> =
  {
    running: {
      ring: "border-emerald-500/25 bg-emerald-500/8",
      text: "text-emerald-400",
      dot: "bg-emerald-400",
    },
    queued: {
      ring: "border-blue-500/25 bg-blue-500/8",
      text: "text-blue-400",
      dot: "bg-blue-400",
    },
    cloning: {
      ring: "border-indigo-500/25 bg-indigo-500/8",
      text: "text-indigo-400",
      dot: "bg-indigo-400",
    },
    building: {
      ring: "border-violet-500/25 bg-violet-500/8",
      text: "text-violet-400",
      dot: "bg-violet-400",
    },
    starting: {
      ring: "border-cyan-500/25 bg-cyan-500/8",
      text: "text-cyan-400",
      dot: "bg-cyan-400",
    },
    stopped: {
      ring: "border-slate-500/25 bg-slate-500/8",
      text: "text-slate-400",
      dot: "bg-slate-500",
    },
    failed: {
      ring: "border-red-500/25 bg-red-500/8",
      text: "text-red-400",
      dot: "bg-red-400",
    },
  };

const HEALTH_CFG: Record<string, { dot: string; label: string }> = {
  healthy: { dot: "bg-emerald-400", label: "Healthy" },
  unhealthy: { dot: "bg-red-400", label: "Unhealthy" },
  unknown: { dot: "bg-slate-500", label: "Checking..." },
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
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${cfg.ring} ${cfg.text}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${cfg.dot}`}
        style={pulse ? { animation: "pulse 1.4s ease-in-out infinite" } : {}}
      />
      {status}
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
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm shadow-2xl ${
        type === "ok"
          ? "border-emerald-500/30 bg-[#0a1a14] text-emerald-300"
          : "border-red-500/30 bg-[#1a0a0a] text-red-300"
      }`}
      style={{ animation: "toastIn .18s ease" }}
    >
      {type === "ok" ? "✓" : "✕"} {msg}
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
    <div className="bg-[#0c1425] border border-[#1a2540] rounded-xl px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-600 mb-1">
        {label}
      </p>
      <p className="text-sm font-bold text-white">{value}</p>
      {sub && <p className="text-[10px] text-slate-600 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading project details...</p>
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
    <div className="min-h-screen" style={{ fontFamily: "'Sora', sans-serif" }}>
      {toast && <Toast {...toast} />}

      {/* ─── Breadcrumb ───────────────────────────────────────────────────── */}
      <nav className="flex items-center gap-2 mb-6 text-xs">
        <button
          onClick={() => router.push("/dashboard/projects")}
          className="text-slate-600 hover:text-slate-400 transition-colors"
        >
          Projects
        </button>
        <span className="text-slate-800">›</span>
        <span className="text-slate-400">{project.name}</span>
      </nav>

      {/* ─── Header card ──────────────────────────────────────────────────── */}
      <div className="bg-[#0c1425] border border-[#1a2540] rounded-2xl p-5 mb-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl border border-[#1a2540] bg-[#111c30] flex items-center justify-center text-xl flex-shrink-0">
              {project.framework.toLowerCase().includes("next")
                ? "▲"
                : project.framework.toLowerCase().includes("vite") ||
                    project.framework.toLowerCase().includes("react")
                  ? "⚡"
                  : project.framework.toLowerCase().includes("python")
                    ? "🐍"
                    : "⬡"}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-lg font-bold text-white leading-tight">
                  {project.name}
                </h1>
                {latestDeployment && (
                  <StatusBadge status={latestDeployment.status} />
                )}
                {isRunning && (
                  <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
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
                className="mt-0.5 block text-xs font-mono text-slate-500 hover:text-indigo-400 transition-colors truncate max-w-xs sm:max-w-sm"
              >
                {project.repoUrl.replace("https://github.com/", "⎇ ")}
              </a>
              <div className="flex flex-wrap items-center gap-3 mt-1.5">
                <span className="text-[10px] text-slate-600">
                  {project.framework} ·{" "}
                  <span className="text-slate-500">{project.branch}</span>
                </span>
                {latestDeployment?.commitHash && (
                  <span className="text-[10px] font-mono text-slate-600">
                    @ {latestDeployment.commitHash.slice(0, 7)}
                  </span>
                )}
                <span className="text-[10px] text-slate-600">
                  Created {timeAgo(project.createdAt)}
                </span>
                {project.autoDeploy && (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-500">
                    <span className="w-1 h-1 rounded-full bg-emerald-500" />{" "}
                    Auto-deploy on
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {domains[0]?.url && (
              <a
                href={domains[0].url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-xl border border-[#1e293b] text-slate-400 hover:text-indigo-400 hover:border-indigo-500/30 transition-all"
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
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all hover:-translate-y-px hover:shadow-[0_6px_20px_rgba(99,102,241,0.25)] disabled:opacity-60 active:translate-y-0"
            >
              {deploying ? (
                <>
                  <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />{" "}
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
                  </svg>{" "}
                  Redeploy
                </>
              )}
            </button>
          </div>
        </div>

        {domains[0]?.url && (
          <div className="mt-4 pt-4 border-t border-[#111c30] flex items-center gap-3 flex-wrap">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-700">
              Live at
            </span>
            <a
              href={domains[0].url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              {domains[0].url}
            </a>
            <button
              onClick={() => {
                navigator.clipboard.writeText(domains[0].url);
                fire("URL copied");
              }}
              className="text-[10px] px-2 py-0.5 rounded-md border border-[#1e293b] text-slate-600 hover:text-slate-400 transition-all"
            >
              Copy
            </button>
          </div>
        )}
      </div>

      {/* ─── Tabs ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-0.5 overflow-x-auto pb-0.5 mb-5 scrollbar-hide">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-[11px] font-medium rounded-xl whitespace-nowrap transition-all ${
                active
                  ? t.danger
                    ? "bg-red-500/10 text-red-400 border border-red-500/20"
                    : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                  : t.danger
                    ? "text-red-700 hover:text-red-500 border border-transparent"
                    : "text-slate-600 hover:text-slate-400 border border-transparent"
              }`}
            >
              {t.label}
              {t.badge !== undefined && Number(t.badge) > 0 && (
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${active ? "bg-indigo-500/20 text-indigo-400" : "bg-[#111c30] text-slate-600"}`}
                >
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ─── Tab content ──────────────────────────────────────────────────── */}

      {/* OVERVIEW */}
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
            <div className="bg-[#0c1425] border border-[#1a2540] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[10px] font-semibold uppercase tracking-widest text-slate-600">
                  Latest Deployment
                </h2>
                <StatusBadge status={latestDeployment.status} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 text-xs">
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
                    <p className="text-[10px] text-slate-600 mb-0.5">{row.l}</p>
                    <p
                      className={`text-slate-300 ${row.mono ? "font-mono" : ""}`}
                    >
                      {row.v}
                    </p>
                  </div>
                ))}
              </div>
              {latestDeployment.errorMessage && (
                <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/6 px-3 py-2.5 text-xs text-red-300 font-mono break-all">
                  {latestDeployment.errorMessage}
                </div>
              )}
              <div className="mt-4 pt-4 border-t border-[#111c30]">
                <button
                  onClick={() =>
                    router.push(
                      `/dashboard/deployments/${latestDeployment._id}`,
                    )
                  }
                  className="px-3 py-1.5 text-xs rounded-lg border border-[#1e293b] text-slate-500 hover:text-indigo-400 hover:border-indigo-500/30 transition-all"
                >
                  View Logs →
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-[#0c1425] border border-[#1a2540] rounded-2xl px-5 py-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#111c30] border border-[#1a2540] mx-auto mb-4 flex items-center justify-center text-2xl">
                🚀
              </div>
              <p className="text-sm text-slate-500 mb-1">No deployments yet</p>
              <p className="text-xs text-slate-700 mb-4">
                Push your first deployment to get started
              </p>
              <button
                onClick={handleRedeploy}
                disabled={deploying}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all disabled:opacity-60"
              >
                Deploy Now
              </button>
            </div>
          )}

          <div className="bg-[#0c1425] border border-[#1a2540] rounded-2xl p-5">
            <h2 className="text-[10px] font-semibold uppercase tracking-widest text-slate-600 mb-3">
              Build Configuration
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { l: "Install", v: project.installCommand },
                { l: "Build", v: project.buildCommand },
                { l: "Root", v: project.rootDirectory },
              ].map((c) => (
                <div
                  key={c.l}
                  className="bg-[#060d1a] border border-[#1e293b] rounded-xl px-3.5 py-2.5"
                >
                  <p className="text-[10px] text-slate-600 mb-1">{c.l}</p>
                  <p className="text-xs font-mono text-slate-300 truncate">
                    {c.v}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* DEPLOYMENTS */}
      {tab === "deployments" && (
        <div className="bg-[#0c1425] border border-[#1a2540] rounded-2xl p-5">
          <h2 className="text-[10px] font-semibold uppercase tracking-widest text-slate-600 mb-4">
            Deployment History
          </h2>
          <DeploymentHistory
            projectId={projectId}
            initialData={initialDeployments}
            onRollback={refresh}
          />
        </div>
      )}

      {/* ENV VARS */}
      {tab === "env" && (
        <div className="bg-[#0c1425] border border-[#1a2540] rounded-2xl p-5">
          <div className="mb-4">
            <h2 className="text-[10px] font-semibold uppercase tracking-widest text-slate-600">
              Environment Variables
            </h2>
            <p className="text-[11px] text-slate-700 mt-0.5">
              Values are masked — never returned in plaintext via the API.
            </p>
          </div>
          <EnvTable
            projectId={projectId}
            initialVars={initialEnvVars}
            onChanged={refresh}
          />
          <div className="mt-4 pt-4 border-t border-[#111c30]">
            <button
              onClick={handleRedeploy}
              disabled={deploying}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all disabled:opacity-60"
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
              {deploying ? "Queuing…" : "Redeploy to Apply Changes"}
            </button>
          </div>
        </div>
      )}

      {/* DOMAINS */}
      {tab === "domains" && (
        <div className="space-y-4">
          <div className="bg-[#0c1425] border border-[#1a2540] rounded-2xl p-5">
            <h2 className="text-[10px] font-semibold uppercase tracking-widest text-slate-600 mb-4">
              Active Domains
            </h2>
            {domains.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm text-slate-600">
                  No domain assigned yet.
                </p>
                <p className="text-xs text-slate-700 mt-1">
                  Deploy the project to receive a subdomain.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {domains.map((d: any) => (
                  <div
                    key={d.subdomain}
                    className="flex items-center justify-between bg-[#060d1a] border border-[#1e293b] rounded-xl px-4 py-3.5 gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${isRunning ? "bg-emerald-400" : "bg-slate-500"}`}
                        style={
                          isRunning ? { animation: "pulse 2s infinite" } : {}
                        }
                      />
                      <div className="min-w-0">
                        <a
                          href={d.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-mono text-indigo-400 hover:text-indigo-300 transition-colors block truncate"
                        >
                          {d.url}
                        </a>
                        <p className="text-[10px] text-slate-600 mt-0.5">
                          {d.isPrimary ? "Primary · auto-assigned" : "Custom"} ·
                          port {d.port}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(d.url);
                          fire("URL copied");
                        }}
                        className="px-2.5 py-1.5 text-[10px] font-medium rounded-lg border border-[#1e293b] text-slate-500 hover:text-slate-300 hover:border-slate-600 transition-all"
                      >
                        Copy
                      </button>
                      <a
                        href={d.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1.5 text-[10px] font-medium rounded-lg border border-[#1e293b] text-slate-500 hover:text-indigo-400 hover:border-indigo-500/30 transition-all"
                      >
                        Open ↗
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="bg-[#0c1425] border border-[#1a2540] rounded-2xl p-5">
            <h2 className="text-[10px] font-semibold uppercase tracking-widest text-slate-600 mb-3">
              How subdomains work
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              ShipStack assigns{" "}
              <code className="text-slate-400 bg-[#060d1a] px-1.5 py-0.5 rounded">
                {project.name.toLowerCase().replace(/\s+/g, "-")}.localhost
              </code>{" "}
              via nginx reverse proxy. Subdomain derives from your project name
              — rename in Settings to change it. Custom domain support (DNS +
              TLS) is planned for Phase 6.
            </p>
          </div>
        </div>
      )}

      {/* METRICS */}
      {tab === "metrics" && (
        <div className="bg-[#0c1425] border border-[#1a2540] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[10px] font-semibold uppercase tracking-widest text-slate-600">
                Runtime Metrics
              </h2>
              <p className="text-[11px] text-slate-700 mt-0.5">
                Live from Docker stats — auto-refreshes every 30s
              </p>
            </div>
            {isRunning && (
              <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-medium">
                <span
                  className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                  style={{ animation: "pulse 1.5s infinite" }}
                />
                Live
              </span>
            )}
          </div>
          <MetricsCards
            projectId={projectId}
            lastDeployAt={latestDeployment?.createdAt}
          />
        </div>
      )}

      {/* SETTINGS */}
      {tab === "settings" && (
        <div className="bg-[#0c1425] border border-[#1a2540] rounded-2xl p-5">
          <h2 className="text-[10px] font-semibold uppercase tracking-widest text-slate-600 mb-5">
            Project Settings
          </h2>
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
      )}

      {/* DANGER ZONE */}
      {tab === "danger" && (
        <ProjectDangerZone
          projectId={projectId}
          projectName={project.name}
          activeDeploymentId={isRunning ? latestDeployment!._id : null}
        />
      )}

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.35} }
        @keyframes toastIn { from{transform:translateY(10px);opacity:0} to{transform:translateY(0);opacity:1} }
        .scrollbar-hide::-webkit-scrollbar{display:none}
        .scrollbar-hide{-ms-overflow-style:none;scrollbar-width:none}
      `,
        }}
      />
    </div>
  );
}
