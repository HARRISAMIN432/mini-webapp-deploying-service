"use client";

import { useState, useEffect, useCallback } from "react";
import { projectApi } from "@/lib/api";
import type { ContainerMetrics } from "@/lib/api";

interface MetricsCardsProps {
  projectId: string;
  lastDeployAt?: string | null;
}

function MetricCard({
  label,
  value,
  sub,
  icon,
  accent = "violet",
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  accent?: "violet" | "green" | "blue" | "amber";
}) {
  const accents = {
    violet: "text-violet-600 bg-violet-50 border-violet-100",
    green: "text-green-600  bg-green-50  border-green-100",
    blue: "text-blue-600   bg-blue-50   border-blue-100",
    amber: "text-amber-600  bg-amber-50  border-amber-100",
  };
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
          {label}
        </p>
        <div
          className={`w-7 h-7 rounded-lg border flex items-center justify-center ${accents[accent]}`}
        >
          {icon}
        </div>
      </div>
      <p className="text-xl font-bold text-gray-900 font-mono">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function formatMb(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb.toFixed(0)} MB`;
}

function timeAgo(dateStr?: string | null): string {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const CpuIcon = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <rect x="9" y="9" width="6" height="6" />
    <path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 15h3M1 9h3M1 15h3" />
  </svg>
);

const MemIcon = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M6 19v-3a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v3" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const UptimeIcon = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

const DeployIcon = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
    <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
  </svg>
);

export function MetricsCards({ projectId, lastDeployAt }: MetricsCardsProps) {
  const [metrics, setMetrics] = useState<ContainerMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = useCallback(async () => {
    try {
      const data = await projectApi.getMetrics(projectId);
      setMetrics(data);
    } catch {
      setMetrics({ available: false, reason: "Failed to fetch metrics" });
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30_000);
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-24 bg-gray-100 border border-gray-200 rounded-xl animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (!metrics?.available) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 px-5 py-10 text-center">
        <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 mx-auto mb-3 flex items-center justify-center">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#9CA3AF"
            strokeWidth="1.5"
          >
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        </div>
        <p className="text-sm text-gray-500 font-medium">
          {metrics?.reason ?? "No running deployment"}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Deploy your project to see live metrics
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
        <MetricCard
          label="CPU Usage"
          value={`${metrics.cpuPercent?.toFixed(1) ?? "0"}%`}
          sub={metrics.error ? "stale" : "live"}
          accent="violet"
          icon={<CpuIcon />}
        />
        <MetricCard
          label="Memory"
          value={formatMb(metrics.memUsedMb ?? 0)}
          sub={`of ${formatMb(metrics.memTotalMb ?? 0)} · ${metrics.memPercent?.toFixed(0)}%`}
          accent="blue"
          icon={<MemIcon />}
        />
        <MetricCard
          label="Uptime"
          value={metrics.uptime ?? "—"}
          sub={
            metrics.startedAt
              ? `since ${new Date(metrics.startedAt).toLocaleTimeString()}`
              : undefined
          }
          accent="green"
          icon={<UptimeIcon />}
        />
        <MetricCard
          label="Last Deploy"
          value={timeAgo(lastDeployAt ?? metrics.lastDeployAt)}
          sub={
            lastDeployAt
              ? new Date(lastDeployAt).toLocaleDateString()
              : undefined
          }
          accent="amber"
          icon={<DeployIcon />}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
            Network In
          </span>
          <span className="text-sm font-mono font-medium text-gray-700">
            ↓ {formatMb(metrics.netInputMb ?? 0)}
          </span>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
            Network Out
          </span>
          <span className="text-sm font-mono font-medium text-gray-700">
            ↑ {formatMb(metrics.netOutputMb ?? 0)}
          </span>
        </div>
      </div>

      <p className="mt-2 text-right text-xs text-gray-300">
        Refreshes every 30s · Live from Docker stats
      </p>
    </div>
  );
}
