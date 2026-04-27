/**
 * deployment.worker.ts  (Phase 4 — subdomain routing)
 *
 * Changes vs Phase 3:
 *  1. After container passes health check, derive a subdomain from the project
 *     name and register the route with nginx.service.
 *  2. publicUrl is now  http://<subdomain>.localhost  instead of
 *     http://localhost:<port>.
 *  3. On stop / fail, unregisterRoute() removes the nginx entry.
 *  4. Deployment model now stores `subdomain` (see deployment.model.ts patch).
 */

import dotenv from "dotenv";
dotenv.config({ quiet: true });
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { Worker } from "bullmq";
import {
  DEPLOY_PROJECT_JOB,
  DEPLOYMENT_QUEUE_NAME,
} from "../queue/deployment.queue";
import { queueConnection } from "../queue/redis";
import { connectDB } from "../config/database";
import { logger } from "../utils/logger";
import { Deployment } from "../models/deployment.model";
import { Project } from "../models/project.model";
import {
  appendDeploymentLog,
  setDeploymentStatus,
} from "../services/logger.service";
import {
  cleanupDirectory,
  cloneRepository,
  getHeadCommitHash,
  runRepoCommand,
} from "../services/git.service";
import { findAvailablePort } from "../services/port.service";
import {
  buildDockerImageWithEnv,
  ensureDockerAvailable,
  ensureDockerfile,
  runDockerContainer,
  stopAndRemoveContainer,
  getFrameworkInfo,
  FrameworkConfig,
} from "../services/docker.service";
import {
  registerRoute,
  unregisterRoute,
  toSubdomain,
  buildPublicUrl,
} from "../services/nginx.service";

// --- Utilities ---

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const splitCommand = (value: string): string[] =>
  value.trim().split(/\s+/).filter(Boolean);

const resolveProjectRootDir = (
  repoDir: string,
  rootDirectory: string,
): string => {
  const normalized = (rootDirectory || "./").trim();
  const safeRelative =
    normalized === "." || normalized === "./"
      ? "."
      : normalized.replace(/^\/+/, "");
  const resolved = path.resolve(repoDir, safeRelative);
  const repoNormalized = path.resolve(repoDir);
  if (!resolved.startsWith(repoNormalized)) {
    throw new Error("Invalid root directory: path traversal is not allowed");
  }
  return resolved;
};

const getContainerLogs = async (
  containerId: string,
  tailLines = 100,
): Promise<string> => {
  try {
    const { execSync } = await import("child_process");
    return execSync(
      `docker logs --tail ${tailLines} --timestamps ${containerId} 2>&1`,
      { encoding: "utf-8", timeout: 8000 },
    ).trim();
  } catch {
    return "";
  }
};

const getContainerState = async (
  containerId: string,
): Promise<string | null> => {
  try {
    const { execSync } = await import("child_process");
    return execSync(
      `docker inspect --format "{{.State.Status}}" ${containerId}`,
      { encoding: "utf-8", timeout: 5000 },
    ).trim();
  } catch {
    return null;
  }
};

const debugLog = (deploymentId: string, message: string, data?: unknown) => {
  const ts = new Date().toISOString();
  console.log(`[${ts}] [WORKER] [${deploymentId.slice(-8)}] ${message}`);
  if (data) {
    console.log(
      `[${ts}] [WORKER] [${deploymentId.slice(-8)}] DATA:`,
      typeof data === "object" ? JSON.stringify(data, null, 2) : data,
    );
  }
};

const cleanupExistingContainer = async (
  containerName: string,
  deploymentId: string,
): Promise<void> => {
  try {
    const { stdout } = await runRepoCommand(
      process.cwd(),
      "docker",
      [
        "ps",
        "-a",
        "--filter",
        `name=${containerName}`,
        "--format",
        "{{.Names}}",
      ],
      5000,
    ).catch(() => ({ stdout: "" }));

    if (stdout.trim()) {
      await stopAndRemoveContainer(containerName);
      await appendDeploymentLog(
        deploymentId,
        "Cleaned up previous deployment instance",
      );
    }
  } catch {
    // Non-critical -- log and continue
  }
};

// --- Core deployment logic ---

const processDeployment = async (payload: {
  deploymentId: string;
  projectId: string;
  ownerId: string;
}) => {
  debugLog(payload.deploymentId, "Starting deployment processing", payload);

  const deployment = await Deployment.findById(payload.deploymentId);
  const project = await Project.findById(payload.projectId);

  if (!deployment || !project) {
    if (deployment) {
      await failDeployment(
        payload.deploymentId,
        "Deployment or project no longer exists",
      );
    }
    return;
  }

  if (deployment.ownerId.toString() !== payload.ownerId) {
    await failDeployment(
      payload.deploymentId,
      "Unauthorized deployment payload",
    );
    return;
  }

  const envVars = project.envVars || [];

  if (envVars.length > 0) {
    await appendDeploymentLog(
      payload.deploymentId,
      `Found ${envVars.length} environment variable(s): ${envVars.map((e) => e.key).join(", ")}`,
    );
  } else {
    await appendDeploymentLog(
      payload.deploymentId,
      "No environment variables configured for this project",
    );
  }

  // Derive subdomain early so logs can reference it
  const subdomain = toSubdomain(project.name);
  const publicUrl = buildPublicUrl(subdomain);

  await appendDeploymentLog(payload.deploymentId, `Target URL: ${publicUrl}`);

  const attemptId = crypto.randomUUID();
  const workDir = path.join(
    "C:\\deployments",
    `${payload.deploymentId}-${attemptId}`,
  );
  const imageTag = `app-${payload.deploymentId}`.toLowerCase();
  const containerName =
    `deploy-${payload.deploymentId}-${Date.now()}`.toLowerCase();
  let containerId: string | null = null;
  let frameworkConfig: FrameworkConfig | null = null;

  try {
    // --- CLONE ---
    await setDeploymentStatus(payload.deploymentId, "cloning", {
      errorMessage: null,
    });
    await appendDeploymentLog(
      payload.deploymentId,
      "Initializing deployment...",
    );
    await appendDeploymentLog(payload.deploymentId, "Fetching repository...");

    await cloneRepository({
      repoUrl: deployment.repoUrl,
      branch: deployment.branch,
      targetDir: workDir,
    });

    const commitHash = await getHeadCommitHash(workDir);
    await setDeploymentStatus(payload.deploymentId, "cloning", { commitHash });
    await appendDeploymentLog(
      payload.deploymentId,
      `Repository cloned at commit ${commitHash?.slice(0, 7) ?? "unknown"}`,
    );

    const appDir = resolveProjectRootDir(workDir, project.rootDirectory);

    // --- DETECT FRAMEWORK ---
    frameworkConfig = await getFrameworkInfo(appDir, envVars);
    await appendDeploymentLog(
      payload.deploymentId,
      `Detected ${frameworkConfig.type} project (port: ${frameworkConfig.port})`,
    );

    // --- VALIDATE project type ---
    const hasPackageJson = await fs
      .access(path.join(appDir, "package.json"))
      .then(() => true)
      .catch(() => false);
    const hasPythonFiles =
      (await fs
        .access(path.join(appDir, "requirements.txt"))
        .then(() => true)
        .catch(() => false)) ||
      (await fs
        .access(path.join(appDir, "app.py"))
        .then(() => true)
        .catch(() => false));

    if (!hasPackageJson && !hasPythonFiles) {
      await failDeployment(
        payload.deploymentId,
        `Unsupported project type: No package.json or Python files found in root directory "${project.rootDirectory}"`,
      );
      return;
    }

    // --- INSTALL ---
    await setDeploymentStatus(payload.deploymentId, "building");
    let installCommand = project.installCommand;
    if (!installCommand && frameworkConfig) {
      installCommand =
        frameworkConfig.type === "python"
          ? "pip install -r requirements.txt"
          : "npm install";
    }

    await appendDeploymentLog(
      payload.deploymentId,
      "Installing dependencies...",
    );
    const [installCmd, ...installArgs] = splitCommand(
      installCommand ||
        (hasPackageJson ? "npm install" : "pip install -r requirements.txt"),
    );
    if (!installCmd) throw new Error("Install command is empty");

    const installRes = await runRepoCommand(
      appDir,
      installCmd,
      installArgs,
      600000,
    );
    if (installRes.stdout.trim()) {
      for (const line of installRes.stdout.trim().split("\n").slice(-50)) {
        if (line.trim()) await appendDeploymentLog(payload.deploymentId, line);
      }
    }
    await appendDeploymentLog(
      payload.deploymentId,
      "Dependencies installed successfully",
    );

    // --- BUILD (Node.js only) ---
    if (hasPackageJson) {
      const pkgJson = JSON.parse(
        await fs.readFile(path.join(appDir, "package.json"), "utf-8"),
      ) as { scripts?: Record<string, string> };

      let buildCommand = project.buildCommand;
      if (!buildCommand && pkgJson.scripts?.build) {
        buildCommand = "npm run build";
      }

      if (buildCommand && pkgJson.scripts?.build) {
        await appendDeploymentLog(
          payload.deploymentId,
          "Running build step...",
        );
        const [buildCmd, ...buildArgs] = splitCommand(buildCommand);
        if (!buildCmd) throw new Error("Build command is empty");

        const buildRes = await runRepoCommand(
          appDir,
          buildCmd,
          buildArgs,
          600000,
        );
        if (buildRes.stdout.trim()) {
          for (const line of buildRes.stdout.trim().split("\n").slice(-50)) {
            if (line.trim())
              await appendDeploymentLog(payload.deploymentId, line);
          }
        }
        await appendDeploymentLog(
          payload.deploymentId,
          "Build completed successfully",
        );
      } else {
        await appendDeploymentLog(
          payload.deploymentId,
          "No build script found -- skipping build step",
        );
      }
    } else {
      await appendDeploymentLog(
        payload.deploymentId,
        "Python project -- skipping build step",
      );
    }

    // --- START CONTAINER ---
    await setDeploymentStatus(payload.deploymentId, "starting");

    const port = await findAvailablePort(5000, 9000);
    await appendDeploymentLog(
      payload.deploymentId,
      `Allocated internal port ${port} -> application port ${frameworkConfig?.port || 3000}`,
    );

    await ensureDockerAvailable();
    await cleanupExistingContainer(containerName, payload.deploymentId);
    await ensureDockerfile(appDir, envVars);

    await appendDeploymentLog(
      payload.deploymentId,
      `Preparing application environment${envVars.length > 0 ? ` with ${envVars.length} configuration variables...` : "..."}`,
    );

    try {
      await buildDockerImageWithEnv(appDir, imageTag, envVars);
      await appendDeploymentLog(
        payload.deploymentId,
        "Application environment prepared",
      );
    } catch (dockerBuildErr) {
      const msg =
        dockerBuildErr instanceof Error
          ? dockerBuildErr.message
          : String(dockerBuildErr);
      await appendDeploymentLog(
        payload.deploymentId,
        `Failed to prepare application environment: ${msg}`,
      );
      throw dockerBuildErr;
    }

    await appendDeploymentLog(payload.deploymentId, "Starting application...");

    try {
      containerId = await runDockerContainer({
        repoDir: appDir,
        imageTag,
        containerName,
        hostPort: port,
        containerPort: frameworkConfig?.port,
        envVars,
      });

      await appendDeploymentLog(
        payload.deploymentId,
        `Application started (instance: ${containerId?.slice(0, 12)})`,
      );
    } catch (runErr) {
      const msg = runErr instanceof Error ? runErr.message : String(runErr);
      await appendDeploymentLog(
        payload.deploymentId,
        `Failed to start application: ${msg}`,
      );
      throw runErr;
    }

    // --- HEALTH CHECK ---
    const healthPath = frameworkConfig?.healthCheckPath || "/";
    const healthUrl = `http://localhost:${port}${healthPath}`;

    await appendDeploymentLog(
      payload.deploymentId,
      `Waiting for application to respond at ${healthUrl}...`,
    );

    const { ok: healthy, lastError } = await waitForHealth(
      healthUrl,
      containerId!,
      payload.deploymentId,
      40_000,
    );

    if (!healthy) {
      let tips = "";
      if (frameworkConfig?.type === "vite") {
        tips =
          "Tip: Set server.host = '0.0.0.0' and server.port = 5173 in your vite.config.";
      } else if (frameworkConfig?.type === "next") {
        tips =
          "Tip: Next.js must be started with -H 0.0.0.0 (e.g. next start -H 0.0.0.0).";
      } else if (frameworkConfig?.type === "python") {
        tips = "Tip: Bind your Python server to 0.0.0.0:8000 (not 127.0.0.1).";
      } else {
        tips =
          "Tip: Make sure your app binds to 0.0.0.0 (not 127.0.0.1/localhost) on the expected port.";
      }

      await failDeployment(
        payload.deploymentId,
        `Health check failed (${lastError}). ${tips}`,
        containerId,
      );
      return;
    }

    // --- REGISTER ROUTE ---
    await appendDeploymentLog(
      payload.deploymentId,
      `Registering route: ${subdomain}.localhost -> port ${port}`,
    );

    await registerRoute({ subdomain, hostPort: port });

    await appendDeploymentLog(
      payload.deploymentId,
      `Application is now live at ${publicUrl}`,
    );

    // --- MARK RUNNING ---
    await setDeploymentStatus(payload.deploymentId, "running", {
      containerId,
      publicUrl,
      port,
      startedAt: new Date(),
      completedAt: new Date(),
      errorMessage: null,
    });

    // Persist subdomain to deployment document
    await Deployment.findByIdAndUpdate(payload.deploymentId, {
      $set: { subdomain },
    });

    await cleanupDirectory(workDir);
    return;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected worker error";
    await failDeployment(payload.deploymentId, message, containerId);
  } finally {
    try {
      await cleanupDirectory(workDir);
    } catch {
      // best-effort
    }
    await Project.findByIdAndUpdate(payload.projectId, {
      activeDeploymentId: null,
    });
  }
};

// --- Health check ---

const waitForHealth = async (
  url: string,
  containerId: string,
  deploymentId: string,
  timeoutMs = 120_000,
): Promise<{ ok: boolean; lastError: string }> => {
  const resolvedUrl = url.replace("localhost", "127.0.0.1");
  const started = Date.now();
  let lastError = "timeout";
  let lastLogOffset = 0;
  let lastLogFlushAt = 0;

  while (Date.now() - started < timeoutMs) {
    const now = Date.now();
    if (now - lastLogFlushAt > 3000) {
      const rawLogs = await getContainerLogs(containerId, 200);
      if (rawLogs) {
        const lines = rawLogs.split("\n");
        const newLines = lines.slice(lastLogOffset);
        for (const line of newLines) {
          if (line.trim()) {
            await appendDeploymentLog(deploymentId, `[app] ${line}`);
          }
        }
        lastLogOffset = lines.length;
      }
      lastLogFlushAt = now;
    }

    const state = await getContainerState(containerId);
    if (state === "exited" || state === "dead") {
      lastError = `Application stopped unexpectedly (state: ${state})`;
      const finalLogs = await getContainerLogs(containerId, 300);
      if (finalLogs) {
        const lines = finalLogs.split("\n");
        for (const line of lines.slice(lastLogOffset)) {
          if (line.trim()) {
            await appendDeploymentLog(deploymentId, `[app] ${line}`);
          }
        }
      }
      break;
    }

    try {
      const response = await fetch(resolvedUrl, {
        signal: AbortSignal.timeout(4000),
      });
      if (response.ok) return { ok: true, lastError: "" };
      lastError = `HTTP ${response.status}`;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }

    await wait(3000);
  }

  return { ok: false, lastError };
};

// --- Failure handler ---

const failDeployment = async (
  deploymentId: string,
  message: string,
  containerId?: string | null,
) => {
  if (containerId) {
    const finalLogs = await getContainerLogs(containerId, 300);
    if (finalLogs) {
      await appendDeploymentLog(
        deploymentId,
        "--- Application output (last 300 lines) ---",
      );
      for (const line of finalLogs.split("\n").filter((l) => l.trim())) {
        await appendDeploymentLog(deploymentId, `[app] ${line}`);
      }
      await appendDeploymentLog(
        deploymentId,
        "--- End of application output ---",
      );
    }
    await stopAndRemoveContainer(containerId);
  }

  try {
    const dep = await Deployment.findById(deploymentId).populate(
      "projectId",
      "name",
    );
    if (dep) {
      const projectName = (dep.projectId as any)?.name;
      if (projectName) {
        await unregisterRoute(toSubdomain(projectName));
      }
    }
  } catch {
    // best-effort
  }

  await appendDeploymentLog(deploymentId, `Deployment failed: ${message}`);
  await setDeploymentStatus(deploymentId, "failed", {
    errorMessage: message,
    completedAt: new Date(),
  });

  const deployment = await Deployment.findById(deploymentId);
  if (deployment) {
    await Project.findByIdAndUpdate(deployment.projectId, {
      $unset: { activeDeploymentId: 1 },
    });
  }
};

// --- Worker bootstrap ---

const startWorker = async () => {
  await connectDB();

  const worker = new Worker(
    DEPLOYMENT_QUEUE_NAME,
    async (job) => {
      if (job.name !== DEPLOY_PROJECT_JOB) return;
      await processDeployment(job.data);
    },
    { connection: queueConnection, concurrency: 2 },
  );

  worker.on("failed", (job, err) => {
    logger.error("Deployment job failed", {
      jobId: job?.id,
      error: err.message,
    });
  });

  logger.info("Deployment worker started (Phase 4 -- subdomain routing)");
};

startWorker().catch((err) => {
  logger.error("Failed to start deployment worker", { error: String(err) });
  process.exit(1);
});
