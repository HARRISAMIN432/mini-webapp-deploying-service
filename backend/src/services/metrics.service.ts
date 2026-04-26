/**
 * metrics.service.ts  (Phase 5)
 *
 * Fetches real-time container metrics from `docker stats --no-stream`.
 * Returns CPU %, memory used/total, network I/O.
 *
 * Design: live fetch on request — no time-series storage for now.
 * This keeps the service stateless and adds zero dependencies.
 */

import { execSync } from "child_process";

export interface ContainerMetrics {
  cpuPercent: number;
  memUsedMb: number;
  memTotalMb: number;
  memPercent: number;
  netInputMb: number;
  netOutputMb: number;
  uptime: string | null;
  error: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Parse docker memory string like "128MiB" or "1.5GiB" to MB. */
function parseMem(raw: string): number {
  const lower = raw.trim().toLowerCase();
  const n = parseFloat(lower);
  if (isNaN(n)) return 0;
  if (lower.includes("gib") || lower.includes("gb")) return n * 1024;
  if (lower.includes("mib") || lower.includes("mb")) return n;
  if (lower.includes("kib") || lower.includes("kb")) return n / 1024;
  return n; // assume bytes
}

/** Parse docker net string like "1.2kB / 5.6MB" to [inputMb, outputMb]. */
function parseNet(raw: string): [number, number] {
  const parts = raw.split("/").map((p) => p.trim());
  if (parts.length < 2) return [0, 0];
  return [parseMem(parts[0]), parseMem(parts[1])];
}

/** Get container uptime string from docker inspect. */
function getContainerUptime(containerIdOrName: string): string | null {
  try {
    const startedAt = execSync(
      `docker inspect --format "{{.State.StartedAt}}" ${containerIdOrName}`,
      { encoding: "utf-8", timeout: 5000 },
    ).trim();

    if (!startedAt || startedAt === "0001-01-01T00:00:00Z") return null;

    const start = new Date(startedAt);
    const nowMs = Date.now() - start.getTime();
    const totalSeconds = Math.floor(nowMs / 1000);

    if (totalSeconds < 60) return `${totalSeconds}s`;
    const minutes = Math.floor(totalSeconds / 60) % 60;
    const hours = Math.floor(totalSeconds / 3600) % 24;
    const days = Math.floor(totalSeconds / 86400);

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  } catch {
    return null;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch live metrics for a single container.
 * Returns a zero-value object if the container is not running or stats fail.
 */
export async function getContainerMetrics(
  containerIdOrName: string,
): Promise<ContainerMetrics> {
  try {
    // Format: ID,CPUPerc,MemUsage,MemPerc,NetIO
    const raw = execSync(
      `docker stats --no-stream --format "{{.ID}},{{.CPUPerc}},{{.MemUsage}},{{.MemPerc}},{{.NetIO}}" ${containerIdOrName}`,
      { encoding: "utf-8", timeout: 10_000 },
    ).trim();

    if (!raw) {
      return zeroMetrics("Container returned no stats");
    }

    // docker stats can return multiple lines — take first non-empty
    const line = raw.split("\n")[0].trim();
    const parts = line.split(",");
    if (parts.length < 5) {
      return zeroMetrics(`Unexpected stats format: ${line}`);
    }

    const [, cpuRaw, memUsageRaw, memPercRaw, netRaw] = parts;

    const [memUsed, memTotal] = memUsageRaw
      .split("/")
      .map((s) => parseMem(s.trim()));
    const [netIn, netOut] = parseNet(netRaw);
    const uptime = getContainerUptime(containerIdOrName);

    return {
      cpuPercent: parseFloat(cpuRaw.replace("%", "")) || 0,
      memUsedMb: memUsed,
      memTotalMb: memTotal,
      memPercent: parseFloat(memPercRaw.replace("%", "")) || 0,
      netInputMb: netIn,
      netOutputMb: netOut,
      uptime,
      error: null,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return zeroMetrics(msg);
  }
}

function zeroMetrics(error: string): ContainerMetrics {
  return {
    cpuPercent: 0,
    memUsedMb: 0,
    memTotalMb: 0,
    memPercent: 0,
    netInputMb: 0,
    netOutputMb: 0,
    uptime: null,
    error,
  };
}
