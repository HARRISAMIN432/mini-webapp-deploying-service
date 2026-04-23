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
  buildDockerImage,
  ensureDockerAvailable,
  ensureDockerfile,
  runDockerContainer,
  stopAndRemoveContainer,
  getFrameworkInfo,
  FrameworkConfig,
} from "../services/docker.service";

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

/**
 * Fetch the last N lines of docker container logs (both stdout + stderr).
 * Returns an empty string if the container doesn't exist or docker fails.
 */
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

/**
 * Inspect a container and return its current state (running, exited, etc.)
 */
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

// Add this near the top of deployment.worker.ts after imports
const debugLog = (deploymentId: string, message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [WORKER] [${deploymentId.slice(-8)}] ${message}`);
  if (data) {
    console.log(
      `[${timestamp}] [WORKER] [${deploymentId.slice(-8)}] DATA:`,
      typeof data === "object" ? JSON.stringify(data, null, 2) : data,
    );
  }
};

// Update the processDeployment function with extensive logging
const processDeployment = async (payload: {
  deploymentId: string;
  projectId: string;
  ownerId: string;
}) => {
  debugLog(payload.deploymentId, "🚀 Starting deployment processing", payload);

  const deployment = await Deployment.findById(payload.deploymentId);
  const project = await Project.findById(payload.projectId);

  if (!deployment || !project) {
    debugLog(payload.deploymentId, "❌ Deployment or project not found", {
      deploymentExists: !!deployment,
      projectExists: !!project,
    });
    if (deployment) {
      await failDeployment(
        payload.deploymentId,
        "Deployment or project no longer exists",
      );
    }
    return;
  }

  debugLog(payload.deploymentId, "✅ Found deployment and project", {
    deploymentStatus: deployment.status,
    projectName: project.name,
    repoUrl: deployment.repoUrl,
  });

  if (deployment.ownerId.toString() !== payload.ownerId) {
    debugLog(payload.deploymentId, "❌ Unauthorized deployment payload", {
      expectedOwner: payload.ownerId,
      actualOwner: deployment.ownerId.toString(),
    });
    await failDeployment(
      payload.deploymentId,
      "Unauthorized deployment payload",
    );
    return;
  }

  const attemptId = crypto.randomUUID();
  const workDir = path.join(
    "C:\\deployments",
    `${payload.deploymentId}-${attemptId}`,
  );
  const imageTag = `app-${payload.deploymentId}`.toLowerCase();
  const containerName = `deploy-${payload.deploymentId}`.toLowerCase();
  let containerId: string | null = null;
  let frameworkConfig: FrameworkConfig | null = null;

  debugLog(payload.deploymentId, "📁 Created working directory config", {
    workDir,
    imageTag,
    containerName,
  });

  try {
    await setDeploymentStatus(payload.deploymentId, "cloning", {
      errorMessage: null,
    });
    await appendDeploymentLog(
      payload.deploymentId,
      "🚀 Starting deployment...",
    );
    await appendDeploymentLog(payload.deploymentId, "📦 Cloning repository...");

    debugLog(payload.deploymentId, "📦 Cloning repository", {
      repoUrl: deployment.repoUrl,
      branch: deployment.branch,
      targetDir: workDir,
    });

    await cloneRepository({
      repoUrl: deployment.repoUrl,
      branch: deployment.branch,
      targetDir: workDir,
    });

    const commitHash = await getHeadCommitHash(workDir);
    debugLog(payload.deploymentId, "📝 Got commit hash", { commitHash });

    await setDeploymentStatus(payload.deploymentId, "cloning", { commitHash });
    await appendDeploymentLog(
      payload.deploymentId,
      `✓ Cloned at commit ${commitHash?.slice(0, 7) ?? "unknown"}`,
    );

    const appDir = resolveProjectRootDir(workDir, project.rootDirectory);
    debugLog(payload.deploymentId, "📂 Resolved app directory", { appDir });

    // Detect framework and get configuration
    frameworkConfig = await getFrameworkInfo(appDir);
    debugLog(payload.deploymentId, "🔍 Detected framework", frameworkConfig);

    await appendDeploymentLog(
      payload.deploymentId,
      `🔍 Detected ${frameworkConfig.type} project (container port: ${frameworkConfig.port})`,
    );

    // Check for package.json (Node.js) or Python files
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

    debugLog(payload.deploymentId, "📋 Project type detection", {
      hasPackageJson,
      hasPythonFiles,
    });

    if (!hasPackageJson && !hasPythonFiles) {
      await failDeployment(
        payload.deploymentId,
        `Unsupported project type: No package.json or Python files found in root directory "${project.rootDirectory}"`,
      );
      return;
    }

    await setDeploymentStatus(payload.deploymentId, "building");

    // Determine install command
    let installCommand = project.installCommand;
    if (!installCommand && frameworkConfig) {
      installCommand =
        frameworkConfig.type === "python"
          ? "pip install -r requirements.txt"
          : "npm install";
    }

    debugLog(payload.deploymentId, "📥 Installing dependencies", {
      installCommand,
    });

    await appendDeploymentLog(
      payload.deploymentId,
      "📥 Installing dependencies...",
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
      const installLines = installRes.stdout.trim().split("\n");
      for (const line of installLines.slice(-50)) {
        if (line.trim()) {
          await appendDeploymentLog(payload.deploymentId, line);
        }
      }
    }
    await appendDeploymentLog(payload.deploymentId, "✓ Dependencies installed");

    // Handle build step for Node.js projects
    if (hasPackageJson) {
      const pkgJsonRaw = await fs.readFile(
        path.join(appDir, "package.json"),
        "utf-8",
      );
      const pkgJson = JSON.parse(pkgJsonRaw) as {
        scripts?: Record<string, string>;
      };

      let buildCommand = project.buildCommand;
      if (!buildCommand && pkgJson.scripts?.build) {
        buildCommand = "npm run build";
      }

      debugLog(payload.deploymentId, "🔨 Build step", {
        buildCommand,
        hasBuildScript: !!pkgJson.scripts?.build,
      });

      if (buildCommand && pkgJson.scripts?.build) {
        await appendDeploymentLog(payload.deploymentId, "🔨 Running build...");
        const [buildCmd, ...buildArgs] = splitCommand(buildCommand);
        if (!buildCmd) throw new Error("Build command is empty");

        const buildRes = await runRepoCommand(
          appDir,
          buildCmd,
          buildArgs,
          600000,
        );
        if (buildRes.stdout.trim()) {
          const buildLines = buildRes.stdout.trim().split("\n");
          for (const line of buildLines.slice(-50)) {
            if (line.trim()) {
              await appendDeploymentLog(payload.deploymentId, line);
            }
          }
        }
        await appendDeploymentLog(payload.deploymentId, "✓ Build complete");
      } else {
        await appendDeploymentLog(
          payload.deploymentId,
          "ℹ No build script found — skipping build step",
        );
      }
    } else {
      await appendDeploymentLog(
        payload.deploymentId,
        "🐍 Python project — skipping build step",
      );
    }

    await setDeploymentStatus(payload.deploymentId, "starting");

    debugLog(payload.deploymentId, "🔌 Finding available port");
    const port = await findAvailablePort(5000, 9000);
    debugLog(payload.deploymentId, "🔌 Port found", { port });

    await appendDeploymentLog(
      payload.deploymentId,
      `🔌 Assigned host port ${port} → container port ${frameworkConfig?.port || 3000}`,
    );

    await ensureDockerAvailable();
    await ensureDockerfile(appDir);

    debugLog(payload.deploymentId, "🐳 Building Docker image");
    await appendDeploymentLog(
      payload.deploymentId,
      "🐳 Building Docker image...",
    );
    try {
      await buildDockerImage(appDir, imageTag);
      debugLog(payload.deploymentId, "✅ Docker image built successfully");
    } catch (dockerBuildErr) {
      const msg =
        dockerBuildErr instanceof Error
          ? dockerBuildErr.message
          : String(dockerBuildErr);
      debugLog(payload.deploymentId, "❌ Docker build failed", { error: msg });
      await appendDeploymentLog(
        payload.deploymentId,
        `❌ Docker build failed:\n${msg}`,
      );
      throw dockerBuildErr;
    }
    await appendDeploymentLog(payload.deploymentId, "✓ Docker image built");

    await appendDeploymentLog(payload.deploymentId, "▶ Starting container...");
    debugLog(payload.deploymentId, "▶ Starting Docker container", {
      repoDir: appDir,
      imageTag,
      containerName,
      hostPort: port,
      containerPort: frameworkConfig?.port,
    });

    try {
      containerId = await runDockerContainer({
        repoDir: appDir,
        imageTag,
        containerName,
        hostPort: port,
        containerPort: frameworkConfig?.port,
      });
      debugLog(payload.deploymentId, "✅ Container started", { containerId });
    } catch (runErr) {
      const msg = runErr instanceof Error ? runErr.message : String(runErr);
      debugLog(payload.deploymentId, "❌ Failed to start container", {
        error: msg,
      });
      await appendDeploymentLog(
        payload.deploymentId,
        `❌ Failed to start container: ${msg}`,
      );
      throw runErr;
    }
    await appendDeploymentLog(
      payload.deploymentId,
      `✓ Container started (id: ${containerId?.slice(0, 12)})`,
    );

    const publicUrl = `http://localhost:${port}`;
    const healthPath = frameworkConfig?.healthCheckPath || "/";

    debugLog(payload.deploymentId, "⏳ Waiting for health check", {
      publicUrl,
      healthPath,
    });

    await appendDeploymentLog(
      payload.deploymentId,
      `⏳ Waiting for app to be healthy at ${publicUrl}${healthPath}…`,
    );

    const { ok: healthy, lastError } = await waitForHealth(
      `${publicUrl}${healthPath}`,
      containerId!,
      payload.deploymentId,
      120_000,
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

      debugLog(payload.deploymentId, "❌ Health check failed", {
        lastError,
        tips,
      });

      await failDeployment(
        payload.deploymentId,
        `Health check failed (${lastError}). ${tips}`,
        containerId,
      );
      return;
    }

    debugLog(
      payload.deploymentId,
      "✅ Health check passed, deployment successful",
    );

    await appendDeploymentLog(payload.deploymentId, "✅ Application is live!");
    await setDeploymentStatus(payload.deploymentId, "running", {
      containerId,
      publicUrl,
      port,
      startedAt: new Date(),
      completedAt: new Date(),
      errorMessage: null,
    });

    // SUCCESS: clean up work directory
    await cleanupDirectory(workDir);
    debugLog(payload.deploymentId, "🧹 Cleaned up working directory");
    return;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected worker error";
    debugLog(payload.deploymentId, "💥 Deployment failed with error", {
      message,
      error,
    });
    await failDeployment(payload.deploymentId, message, containerId);
  } finally {
    try {
      await cleanupDirectory(workDir);
      debugLog(payload.deploymentId, "🧹 Final cleanup complete");
    } catch (err) {
      debugLog(payload.deploymentId, "⚠️ Cleanup failed", err);
    }
    await Project.findByIdAndUpdate(payload.projectId, {
      activeDeploymentId: null,
    });
  }
};

/**
 * Wait for a container to respond with HTTP 2xx on `url`.
 *
 * While waiting, streams container logs in real-time to the deployment
 * terminal so users see exactly why the container is failing/starting.
 *
 * Uses 127.0.0.1 explicitly — on Windows, Node may resolve "localhost" as
 * the IPv6 loopback (::1) which Docker Desktop does not bind by default.
 */
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
    // ── 1. Stream any new container logs to the terminal ──────────────────
    const now = Date.now();
    if (now - lastLogFlushAt > 3000) {
      const rawLogs = await getContainerLogs(containerId, 200);
      if (rawLogs) {
        const lines = rawLogs.split("\n");
        const newLines = lines.slice(lastLogOffset);
        if (newLines.length > 0) {
          // Emit each line individually so the terminal renders them cleanly
          for (const line of newLines) {
            if (line.trim()) {
              await appendDeploymentLog(deploymentId, `[container] ${line}`);
            }
          }
          lastLogOffset = lines.length;
        }
      }
      lastLogFlushAt = now;
    }

    // ── 2. Check the container is still alive ────────────────────────────
    const state = await getContainerState(containerId);
    if (state === "exited" || state === "dead") {
      lastError = `Container exited prematurely (state: ${state})`;

      // Flush all remaining container logs before reporting failure
      const finalLogs = await getContainerLogs(containerId, 300);
      if (finalLogs) {
        const lines = finalLogs.split("\n");
        const newLines = lines.slice(lastLogOffset);
        for (const line of newLines) {
          if (line.trim()) {
            await appendDeploymentLog(deploymentId, `[container] ${line}`);
          }
        }
      }
      break;
    }

    // ── 3. HTTP probe ────────────────────────────────────────────────────
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

const failDeployment = async (
  deploymentId: string,
  message: string,
  containerId?: string | null,
) => {
  if (containerId) {
    // Capture final container logs before teardown
    const finalLogs = await getContainerLogs(containerId, 300);
    if (finalLogs) {
      await appendDeploymentLog(
        deploymentId,
        `──── Container output (last 300 lines) ────`,
      );
      // Write in chunks so the terminal doesn't overflow a single log entry
      const lines = finalLogs.split("\n").filter((l) => l.trim());
      for (const line of lines) {
        await appendDeploymentLog(deploymentId, `[container] ${line}`);
      }
      await appendDeploymentLog(
        deploymentId,
        `──── End of container output ────`,
      );
    }
    await stopAndRemoveContainer(containerId);
  }

  await appendDeploymentLog(deploymentId, `❌ Failed: ${message}`);
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

  logger.info("Deployment worker started");
};

startWorker().catch((err) => {
  logger.error("Failed to start deployment worker", { error: String(err) });
  process.exit(1);
});
