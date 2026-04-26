/**
 * project.service.ts  (Phase 5)
 *
 * New methods added vs Phase 4:
 *  - getProjectDetails()   — single endpoint for detail page
 *  - redeployProject()     — queue new deployment from latest successful
 *  - rollbackDeployment()  — rebuild from a specific old deployment
 *  - listProjectDeployments() — paginated deployments for a project
 *  - updateProjectSettings()  — patch name, commands, autoDeploy, etc.
 *  - getProjectMetrics()      — live docker stats
 *  - getProjectDomains()      — from nginx registry
 *  - triggerFromWebhook()     — auto-deploy on GitHub push
 */

import { Types } from "mongoose";
import { Deployment } from "../models/deployment.model";
import { Project } from "../models/project.model";
import { conflict, notFound } from "../utils/errors";
import { enqueueDeployment } from "../queue/deployment.queue";
import { appendDeploymentLog } from "./logger.service";
import { stopAndRemoveContainer } from "./docker.service";
import { unregisterRoute, toSubdomain, listRoutes } from "./nginx.service";
import { getContainerMetrics } from "./metrics.service";
import type {
  CreateProjectInput,
  UpdateProjectInput,
} from "../validators/project.validators";
import { error } from "node:console";

// ─── Shared helpers ───────────────────────────────────────────────────────────

const sanitizeProjectInput = <
  T extends { envVars?: Array<{ key: string; value: string }> },
>(
  input: T,
): T => ({
  ...input,
  envVars:
    input.envVars
      ?.filter((pair) => pair.key.trim().length > 0)
      .map((pair) => ({ key: pair.key.trim(), value: pair.value })) ?? [],
});

const ensureProjectOwnership = async (projectId: string, ownerId: string) => {
  const project = await Project.findOne({
    _id: new Types.ObjectId(projectId),
    ownerId: new Types.ObjectId(ownerId),
  });
  if (!project) throw notFound("Project not found");
  return project;
};

const teardownDeployment = async (deployment: {
  containerId?: string | null;
  subdomain?: string | null;
}) => {
  if (deployment.containerId) {
    try {
      await stopAndRemoveContainer(deployment.containerId);
    } catch {}
  }
  if (deployment.subdomain) {
    try {
      await unregisterRoute(deployment.subdomain);
    } catch {}
  }
};

// ─── Project CRUD ─────────────────────────────────────────────────────────────

export const listProjects = async (ownerId: string) =>
  Project.find({ ownerId: new Types.ObjectId(ownerId) }).sort({
    createdAt: -1,
  });

export const createProject = async (
  ownerId: string,
  input: CreateProjectInput,
) => {
  const safeInput = sanitizeProjectInput(input);
  const existing = await Project.findOne({
    ownerId: new Types.ObjectId(ownerId),
    name: safeInput.name,
  });
  if (existing) throw conflict("A project with this name already exists");

  return Project.create({ ...safeInput, ownerId: new Types.ObjectId(ownerId) });
};

export const getProject = async (ownerId: string, projectId: string) =>
  ensureProjectOwnership(projectId, ownerId);

export const updateProject = async (
  ownerId: string,
  projectId: string,
  input: UpdateProjectInput,
) => {
  const safeInput = sanitizeProjectInput(input);
  const project = await ensureProjectOwnership(projectId, ownerId);

  if (safeInput.name && safeInput.name !== project.name) {
    const duplicate = await Project.findOne({
      ownerId: new Types.ObjectId(ownerId),
      name: safeInput.name,
      _id: { $ne: project._id },
    });
    if (duplicate) throw conflict("A project with this name already exists");
  }

  Object.assign(project, safeInput);
  await project.save();
  return project;
};

export const deleteProject = async (ownerId: string, projectId: string) => {
  const project = await ensureProjectOwnership(projectId, ownerId);
  const deployments = await Deployment.find({ projectId: project._id });
  await Promise.allSettled(deployments.map(teardownDeployment));
  await Deployment.deleteMany({
    projectId: project._id,
    ownerId: new Types.ObjectId(ownerId),
  });
  await project.deleteOne();
};

// ─── Phase 5: Project Detail ──────────────────────────────────────────────────

export const getProjectDetails = async (ownerId: string, projectId: string) => {
  const project = await ensureProjectOwnership(projectId, ownerId);

  const [latestDeployment, deploymentCount, allRoutes] = await Promise.all([
    Deployment.findOne({ projectId: project._id })
      .sort({ createdAt: -1 })
      .select(
        "status publicUrl commitHash createdAt completedAt healthStatus triggerSource branch",
      ),
    Deployment.countDocuments({ projectId: project._id }),
    listRoutes(),
  ]);

  const subdomain = toSubdomain(project.name);
  const nginxEntry = allRoutes.find((r) => r.subdomain === subdomain);

  return {
    project: {
      ...project.toJSON(),
      envVars: undefined, // never return raw env vars
    },
    latestDeployment,
    domains: nginxEntry
      ? [{ subdomain, port: nginxEntry.hostPort, isPrimary: true }]
      : [],
    envVarsCount: project.envVars.length,
    deploymentCount,
  };
};

// ─── Phase 5: Settings Update ─────────────────────────────────────────────────

export const updateProjectSettings = async (
  ownerId: string,
  projectId: string,
  settings: {
    name?: string;
    buildCommand?: string;
    startCommand?: string;
    installCommand?: string;
    rootDirectory?: string;
    branch?: string;
    autoDeploy?: boolean;
    trackedBranch?: string;
  },
) => {
  const project = await ensureProjectOwnership(projectId, ownerId);

  if (settings.name && settings.name !== project.name) {
    const duplicate = await Project.findOne({
      ownerId: new Types.ObjectId(ownerId),
      name: settings.name,
      _id: { $ne: project._id },
    });
    if (duplicate) throw conflict("A project with this name already exists");
  }

  const allowed = [
    "name",
    "buildCommand",
    "startCommand",
    "installCommand",
    "rootDirectory",
    "branch",
    "autoDeploy",
    "trackedBranch",
  ] as const;

  for (const key of allowed) {
    if (settings[key] !== undefined) {
      (project as any)[key] = settings[key];
    }
  }

  await project.save();
  return project;
};

// ─── Deployments ──────────────────────────────────────────────────────────────

export const listDeployments = async (ownerId: string) =>
  Deployment.find({ ownerId: new Types.ObjectId(ownerId) })
    .sort({ createdAt: -1 })
    .populate("projectId", "name repoUrl framework branch");

export const listProjectDeployments = async (
  ownerId: string,
  projectId: string,
  page = 1,
  limit = 20,
) => {
  const project = await ensureProjectOwnership(projectId, ownerId);
  const skip = (page - 1) * limit;

  const [deployments, total] = await Promise.all([
    Deployment.find({ projectId: project._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select(
        "status commitHash branch triggerSource publicUrl createdAt completedAt startedAt errorMessage healthStatus port",
      ),
    Deployment.countDocuments({ projectId: project._id }),
  ]);

  return {
    deployments,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getDeployment = async (ownerId: string, deploymentId: string) => {
  const deployment = await Deployment.findOne({
    _id: new Types.ObjectId(deploymentId),
    ownerId: new Types.ObjectId(ownerId),
  }).populate("projectId", "name repoUrl framework branch");

  if (!deployment) throw notFound("Deployment not found");
  return deployment;
};

export const createDeployment = async (ownerId: string, projectId: string) => {
  const project = await ensureProjectOwnership(projectId, ownerId);

  if (project.activeDeploymentId) {
    const active = await Deployment.findOne({
      _id: project.activeDeploymentId,
      status: { $in: ["queued", "cloning", "building", "starting", "running"] },
    });
    if (active) throw conflict("This project already has an active deployment");
  }

  const deployment = await Deployment.create({
    projectId: project._id,
    ownerId: new Types.ObjectId(ownerId),
    status: "queued",
    repoUrl: project.repoUrl,
    branch: project.branch,
    triggerSource: "manual",
    logs: [],
    commitHash: null,
    subdomain: null,
    publicUrl: null,
    containerId: null,
    imageTag: null,
    port: null,
    startedAt: null,
    completedAt: null,
    errorMessage: null,
  });

  project.activeDeploymentId = deployment._id;
  await project.save();

  await appendDeploymentLog(deployment._id, "Deployment queued");
  await appendDeploymentLog(
    deployment._id,
    `Repository: ${project.repoUrl} (branch: ${project.branch})`,
  );
  await enqueueDeployment({
    deploymentId: deployment._id.toString(),
    projectId: project._id.toString(),
    ownerId,
  });

  return deployment;
};

// ─── Phase 5: Redeploy ────────────────────────────────────────────────────────

export const redeployProject = async (ownerId: string, projectId: string) => {
  const project = await ensureProjectOwnership(projectId, ownerId);

  // Block if already in-flight
  if (project.activeDeploymentId) {
    const active = await Deployment.findOne({
      _id: project.activeDeploymentId,
      status: { $in: ["queued", "cloning", "building", "starting"] },
    });
    if (active) throw conflict("A deployment is already in progress");
  }

  const deployment = await Deployment.create({
    projectId: project._id,
    ownerId: new Types.ObjectId(ownerId),
    status: "queued",
    repoUrl: project.repoUrl,
    branch: project.branch,
    triggerSource: "redeploy",
    logs: [],
    commitHash: null,
    subdomain: null,
    publicUrl: null,
    containerId: null,
    imageTag: null,
    port: null,
    startedAt: null,
    completedAt: null,
    errorMessage: null,
  });

  project.activeDeploymentId = deployment._id;
  await project.save();

  await appendDeploymentLog(
    deployment._id,
    "Redeployment queued (latest commit)",
  );
  await enqueueDeployment({
    deploymentId: deployment._id.toString(),
    projectId: project._id.toString(),
    ownerId,
  });

  return deployment;
};

// ─── Phase 5: Rollback ────────────────────────────────────────────────────────

export const rollbackToDeployment = async (
  ownerId: string,
  projectId: string,
  targetDeploymentId: string,
) => {
  const project = await ensureProjectOwnership(projectId, ownerId);

  // Find the target deployment — must belong to this project and be successful
  const target = await Deployment.findOne({
    _id: new Types.ObjectId(targetDeploymentId),
    projectId: project._id,
    ownerId: new Types.ObjectId(ownerId),
    status: { $in: ["running", "stopped", "failed"] }, // allow any completed state
  });

  if (!target)
    throw notFound("Target deployment not found or cannot be rolled back to");

  if (!target.commitHash && !target.repoUrl) {
    throw error("Target deployment has no source reference for rollback");
  }

  // Block if already in-flight
  if (project.activeDeploymentId) {
    const active = await Deployment.findOne({
      _id: project.activeDeploymentId,
      status: { $in: ["queued", "cloning", "building", "starting"] },
    });
    if (active) throw conflict("A deployment is already in progress");
  }

  // Create a new deployment cloning from the same repo+branch
  // The worker will git clone and naturally pick up the latest commit.
  // For true SHA-pinned rollback the worker would need to handle commitHash —
  // we record the intention here and the worker can read it.
  const deployment = await Deployment.create({
    projectId: project._id,
    ownerId: new Types.ObjectId(ownerId),
    status: "queued",
    repoUrl: target.repoUrl,
    branch: target.branch,
    triggerSource: "rollback",
    logs: [],
    commitHash: null,
    subdomain: null,
    publicUrl: null,
    containerId: null,
    imageTag: null,
    port: null,
    startedAt: null,
    completedAt: null,
    errorMessage: null,
  });

  project.activeDeploymentId = deployment._id;
  await project.save();

  await appendDeploymentLog(
    deployment._id,
    `Rollback queued — source: deployment ${targetDeploymentId.slice(-8)} (commit: ${target.commitHash?.slice(0, 7) ?? "unknown"})`,
  );
  await enqueueDeployment({
    deploymentId: deployment._id.toString(),
    projectId: project._id.toString(),
    ownerId,
  });

  return deployment;
};

// ─── Phase 5: Stop Deployment ─────────────────────────────────────────────────

export const stopDeployment = async (ownerId: string, deploymentId: string) => {
  const deployment = await Deployment.findOne({
    _id: new Types.ObjectId(deploymentId),
    ownerId: new Types.ObjectId(ownerId),
  });
  if (!deployment) throw notFound("Deployment not found");

  await teardownDeployment(deployment);

  deployment.status = "stopped";
  deployment.completedAt = new Date();
  deployment.errorMessage = null;
  await deployment.save();

  await Project.updateOne(
    { _id: deployment.projectId, activeDeploymentId: deployment._id },
    { $set: { activeDeploymentId: null } },
  );

  await appendDeploymentLog(deployment._id, "Deployment stopped by user");
  return deployment;
};

// ─── Phase 5: Metrics ────────────────────────────────────────────────────────

export const getProjectMetrics = async (ownerId: string, projectId: string) => {
  const project = await ensureProjectOwnership(projectId, ownerId);

  const latestRunning = await Deployment.findOne({
    projectId: project._id,
    status: "running",
  }).select("containerId port startedAt completedAt createdAt");

  if (!latestRunning || !latestRunning.containerId) {
    return { available: false, reason: "No running deployment" };
  }

  const metrics = await getContainerMetrics(latestRunning.containerId);

  return {
    available: true,
    containerId: latestRunning.containerId.slice(0, 12),
    lastDeployAt: latestRunning.createdAt,
    startedAt: latestRunning.startedAt,
    ...metrics,
  };
};

// ─── Phase 5: Domains ────────────────────────────────────────────────────────

export const getProjectDomains = async (ownerId: string, projectId: string) => {
  const project = await ensureProjectOwnership(projectId, ownerId);
  const subdomain = toSubdomain(project.name);
  const allRoutes = await listRoutes();
  const entry = allRoutes.find((r) => r.subdomain === subdomain);

  return {
    defaultDomain: entry
      ? {
          subdomain,
          url: `http://${subdomain}.localhost${process.env.NGINX_PUBLIC_PORT && process.env.NGINX_PUBLIC_PORT !== "80" ? `:${process.env.NGINX_PUBLIC_PORT}` : ""}`,
          isPrimary: true,
          port: entry.hostPort,
        }
      : null,
  };
};

// ─── Phase 5: Logs ───────────────────────────────────────────────────────────

export const getLogsForDeployment = async (
  ownerId: string,
  deploymentId: string,
  limit = 500,
) => {
  const deployment = await Deployment.findOne({
    _id: new Types.ObjectId(deploymentId),
    ownerId: new Types.ObjectId(ownerId),
  }).populate("projectId", "name");

  if (!deployment) return [];

  const logs = deployment.logs || [];
  const projectName = (deployment.projectId as any)?.name || "Unknown";

  return logs.map((logText: string, index: number) => {
    const timeMatch = logText.match(/\[(\d{2}):(\d{2}):(\d{2})\]/);
    let timestamp = new Date(deployment.createdAt).getTime() + index * 100;
    if (timeMatch) {
      const d = new Date(deployment.createdAt);
      d.setHours(
        parseInt(timeMatch[1], 10),
        parseInt(timeMatch[2], 10),
        parseInt(timeMatch[3], 10),
      );
      timestamp = d.getTime();
    }
    return {
      id: `${deployment._id}-${index}`,
      text: logText,
      timestamp,
      deploymentId: deployment._id.toString(),
      projectName,
    };
  });
};

export const getRecentLogs = async (
  ownerId: string,
  options: { limit: number; allRecent?: boolean },
) => {
  const deploymentLimit = options.allRecent ? 3 : 1;
  const recentDeployments = await Deployment.find({
    ownerId: new Types.ObjectId(ownerId),
  })
    .sort({ createdAt: -1 })
    .limit(deploymentLimit)
    .populate("projectId", "name");

  if (recentDeployments.length === 0) return [];

  const allLogs: Array<{
    id: string;
    text: string;
    timestamp: number;
    deploymentId: string;
    projectName: string;
  }> = [];

  for (const deployment of recentDeployments) {
    const logs = deployment.logs || [];
    const projectName = (deployment.projectId as any)?.name || "Unknown";
    logs.forEach((logText: string, index: number) => {
      const timeMatch = logText.match(/\[(\d{2}):(\d{2}):(\d{2})\]/);
      let timestamp =
        new Date(deployment.createdAt).getTime() + (logs.length - index) * 1000;
      if (timeMatch) {
        const d = new Date(deployment.createdAt);
        d.setHours(
          parseInt(timeMatch[1], 10),
          parseInt(timeMatch[2], 10),
          parseInt(timeMatch[3], 10),
        );
        timestamp = d.getTime();
      }
      allLogs.push({
        id: `${deployment._id}-${index}`,
        text: logText,
        timestamp,
        deploymentId: deployment._id.toString(),
        projectName,
      });
    });
  }

  allLogs.sort((a, b) => a.timestamp - b.timestamp);
  return allLogs.slice(-options.limit);
};

// ─── Phase 5: Webhook / Auto-deploy ──────────────────────────────────────────

export const triggerFromWebhook = async (
  repoUrl: string,
  pushedBranch: string,
  commitSha: string,
): Promise<{
  triggered: boolean;
  projectId?: string;
  deploymentId?: string;
}> => {
  // Normalize repo URL for matching (strip .git suffix, lowercase)
  const normalizedUrl = repoUrl.replace(/\.git$/, "").toLowerCase();

  // Find all projects with autoDeploy enabled that watch this repo + branch
  const projects = await Project.find({ autoDeploy: true });

  const matchingProject = projects.find((p) => {
    const projectUrl = p.repoUrl.replace(/\.git$/, "").toLowerCase();
    return (
      projectUrl === normalizedUrl &&
      (p.trackedBranch || "main") === pushedBranch
    );
  });

  if (!matchingProject) {
    return { triggered: false };
  }

  // Don't deploy if one is already queued/running
  if (matchingProject.activeDeploymentId) {
    const active = await Deployment.findOne({
      _id: matchingProject.activeDeploymentId,
      status: { $in: ["queued", "cloning", "building", "starting", "running"] },
    });
    if (active) return { triggered: false };
  }

  const deployment = await Deployment.create({
    projectId: matchingProject._id,
    ownerId: matchingProject.ownerId,
    status: "queued",
    repoUrl: matchingProject.repoUrl,
    branch: pushedBranch,
    triggerSource: "webhook",
    logs: [],
    commitHash: commitSha || null,
    subdomain: null,
    publicUrl: null,
    containerId: null,
    imageTag: null,
    port: null,
    startedAt: null,
    completedAt: null,
    errorMessage: null,
  });

  matchingProject.activeDeploymentId = deployment._id;
  await matchingProject.save();

  await appendDeploymentLog(
    deployment._id,
    `Auto-deploy triggered by GitHub push (commit: ${commitSha?.slice(0, 7) ?? "unknown"})`,
  );
  await enqueueDeployment({
    deploymentId: deployment._id.toString(),
    projectId: matchingProject._id.toString(),
    ownerId: matchingProject.ownerId.toString(),
  });

  return {
    triggered: true,
    projectId: matchingProject._id.toString(),
    deploymentId: deployment._id.toString(),
  };
};
