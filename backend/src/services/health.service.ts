/**
 * health.service.ts  (Phase 5)
 *
 * Background health-check monitor.
 * - Runs every 30 seconds
 * - Pings each "running" deployment's public URL
 * - Tracks consecutive failures
 * - Marks deployment unhealthy after 3 consecutive failures
 * - Attempts auto-recovery via `docker restart` if container exited
 */

import { execSync } from "child_process";
import { Deployment } from "../models/deployment.model";
import { Project } from "../models/project.model";
import { logger } from "../utils/logger";

const HEALTH_INTERVAL_MS = 30_000;
const UNHEALTHY_THRESHOLD = 3;
const HTTP_TIMEOUT_MS = 5_000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getContainerStatus(containerIdOrName: string): string {
  try {
    return execSync(
      `docker inspect --format "{{.State.Status}}" ${containerIdOrName}`,
      { encoding: "utf-8", timeout: 5000 },
    ).trim();
  } catch {
    return "unknown";
  }
}

function restartContainer(containerIdOrName: string): boolean {
  try {
    execSync(`docker restart ${containerIdOrName}`, {
      timeout: 15_000,
      stdio: "pipe",
    });
    return true;
  } catch {
    return false;
  }
}

async function pingUrl(url: string): Promise<boolean> {
  try {
    // Replace localhost with 127.0.0.1 for Docker Desktop compatibility
    const resolvedUrl = url.replace(/localhost/, "127.0.0.1");
    const resp = await fetch(resolvedUrl, {
      signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
    });
    return resp.status < 500;
  } catch {
    return false;
  }
}

// ─── Core check ───────────────────────────────────────────────────────────────

async function checkDeployment(deployment: {
  _id: any;
  containerId: string | null;
  port: number | null;
  consecutiveFailures: number;
  projectId: any;
}): Promise<void> {
  const depId = deployment._id.toString();

  // Build health URL — prefer port-based direct check (avoids nginx layer)
  const healthUrl = deployment.port
    ? `http://127.0.0.1:${deployment.port}/`
    : null;

  if (!healthUrl || !deployment.containerId) {
    // Can't check without port/container — mark unknown
    await Deployment.findByIdAndUpdate(depId, {
      $set: { healthStatus: "unknown", lastHealthCheckAt: new Date() },
    });
    return;
  }

  // First check if container is even running
  const containerStatus = getContainerStatus(deployment.containerId);

  if (containerStatus === "exited" || containerStatus === "dead") {
    logger.warn(
      `[health] Deployment ${depId} container exited. Attempting restart.`,
    );

    const restarted = restartContainer(deployment.containerId);

    await Deployment.findByIdAndUpdate(depId, {
      $set: {
        healthStatus: restarted ? "unknown" : "unhealthy",
        consecutiveFailures: restarted ? 0 : deployment.consecutiveFailures + 1,
        lastHealthCheckAt: new Date(),
        ...(restarted
          ? {}
          : {
              status: "failed",
              errorMessage: "Container exited and could not be restarted",
            }),
      },
    });
    return;
  }

  const isHealthy = await pingUrl(healthUrl);

  if (isHealthy) {
    await Deployment.findByIdAndUpdate(depId, {
      $set: {
        healthStatus: "healthy",
        consecutiveFailures: 0,
        lastHealthCheckAt: new Date(),
      },
    });
  } else {
    const newFailures = deployment.consecutiveFailures + 1;
    const nowUnhealthy = newFailures >= UNHEALTHY_THRESHOLD;

    await Deployment.findByIdAndUpdate(depId, {
      $set: {
        healthStatus: nowUnhealthy ? "unhealthy" : "unknown",
        consecutiveFailures: newFailures,
        lastHealthCheckAt: new Date(),
      },
    });

    if (nowUnhealthy) {
      logger.warn(
        `[health] Deployment ${depId} marked UNHEALTHY after ${newFailures} failures`,
      );
    }
  }
}

async function detectDeadContainers(): Promise<void> {
  // Find deployments marked as "running" but whose containers are actually dead
  const running = await Deployment.find({ status: "running" })
    .select("_id containerId status")
    .lean();

  for (const deployment of running) {
    if (!deployment.containerId) continue;

    const containerStatus = getContainerStatus(deployment.containerId);

    // If container is exited/dead but DB says running → update status
    if (containerStatus === "exited" || containerStatus === "dead") {
      logger.warn(
        `[health] Deployment ${deployment._id} marked running but container is ${containerStatus}`,
      );

      await Deployment.findByIdAndUpdate(deployment._id, {
        $set: {
          status: "stopped",
          completedAt: new Date(),
          errorMessage: `Container ${containerStatus} unexpectedly`,
          healthStatus: "unhealthy",
        },
        $unset: { activeDeploymentId: "" },
      });

      // Also clear activeDeploymentId from project
      await Project.updateOne(
        { activeDeploymentId: deployment._id },
        { $set: { activeDeploymentId: null } },
      );
    }
  }
}

// ─── Runner ───────────────────────────────────────────────────────────────────

async function runHealthChecks(): Promise<void> {
  try {
    // First, detect any containers that died unexpectedly
    await detectDeadContainers();

    const running = await Deployment.find({ status: "running" })
      .select("_id containerId port consecutiveFailures projectId")
      .lean();

    if (running.length === 0) return;

    logger.info(`[health] Checking ${running.length} running deployment(s)`);

    const BATCH = 5;
    for (let i = 0; i < running.length; i += BATCH) {
      const batch = running.slice(i, i + BATCH);
      await Promise.allSettled(batch.map((dep) => checkDeployment(dep)));
    }
  } catch (err) {
    logger.error("[health] Health check run failed", { error: String(err) });
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

let intervalHandle: ReturnType<typeof setInterval> | null = null;

export function startHealthMonitor(): void {
  if (intervalHandle) return; // idempotent
  logger.info(
    `[health] Starting health monitor (interval: ${HEALTH_INTERVAL_MS}ms)`,
  );
  // Stagger first run by 10s so server has time to fully boot
  setTimeout(() => {
    runHealthChecks();
    intervalHandle = setInterval(runHealthChecks, HEALTH_INTERVAL_MS);
  }, 10_000);
}

export function stopHealthMonitor(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}

/** One-shot check for a single deployment (used by metrics/detail endpoints). */
export async function checkDeploymentHealth(
  deploymentId: string,
): Promise<void> {
  const dep = await Deployment.findById(deploymentId)
    .select("_id containerId port consecutiveFailures projectId")
    .lean();
  if (dep) await checkDeployment(dep);
}
