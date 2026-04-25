/**
 * project.service.ts  (Phase 4 — fixed)
 *
 * Fixes vs previous version:
 *  1. deleteProject now stops all running containers + unregisters nginx routes
 *  2. stopDeployment now clears project.activeDeploymentId
 *  3. createDeployment checks only truly active statuses (not stopped/failed)
 */

import { Types } from "mongoose";
import { Deployment } from "../models/deployment.model";
import { Project } from "../models/project.model";
import { conflict, notFound } from "../utils/errors";
import { enqueueDeployment } from "../queue/deployment.queue";
import { appendDeploymentLog } from "./logger.service";
import { stopAndRemoveContainer } from "./docker.service";
import { unregisterRoute, toSubdomain } from "./nginx.service";
import type {
  CreateProjectInput,
  UpdateProjectInput,
} from "../validators/project.validators";

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
      .map((pair) => ({
        key: pair.key.trim(),
        value: pair.value,
      })) ?? [],
});

const ensureProjectOwnership = async (projectId: string, ownerId: string) => {
  const project = await Project.findOne({
    _id: new Types.ObjectId(projectId),
    ownerId: new Types.ObjectId(ownerId),
  });

  if (!project) throw notFound("Project not found");
  return project;
};

// ─── Helper: tear down a deployment's container + nginx route ─────────────────

const teardownDeployment = async (deployment: {
  containerId?: string | null;
  subdomain?: string | null;
}) => {
  if (deployment.containerId) {
    try {
      await stopAndRemoveContainer(deployment.containerId);
    } catch {
      // Container may already be gone — not fatal
    }
  }
  if (deployment.subdomain) {
    try {
      await unregisterRoute(deployment.subdomain);
    } catch {
      // Best-effort
    }
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
  console.log("existing", existing);

  return Project.create({
    ...safeInput,
    ownerId: new Types.ObjectId(ownerId),
  });
};

export const getProject = async (ownerId: string, projectId: string) =>
  ensureProjectOwnership(projectId, ownerId);

export const getLogsForDeployment = async (
  ownerId: string,
  deploymentId: string,
  limit = 500,
): Promise<
  Array<{
    id: string;
    text: string;
    timestamp: number;
    deploymentId: string;
    projectName: string;
  }>
> => {
  const deployment = await Deployment.findOne({
    _id: new Types.ObjectId(deploymentId),
    ownerId: new Types.ObjectId(ownerId),
  }).populate("projectId", "name");

  if (!deployment) return [];

  const logs = deployment.logs || [];
  const projectName = (deployment.projectId as any)?.name || "Unknown Project";

  return logs.map((logText: string, index: number) => {
    const timeMatch = logText.match(/\[(\d{2}):(\d{2}):(\d{2})\]/);
    let timestamp = new Date(deployment.createdAt).getTime() + index * 100;

    if (timeMatch) {
      const date = new Date(deployment.createdAt);
      date.setHours(
        parseInt(timeMatch[1], 10),
        parseInt(timeMatch[2], 10),
        parseInt(timeMatch[3], 10),
      );
      timestamp = date.getTime();
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

/** @deprecated Use getLogsForDeployment for scoped logs. */
export const getRecentLogs = async (
  ownerId: string,
  options: { limit: number; allRecent?: boolean },
): Promise<
  Array<{
    id: string;
    text: string;
    timestamp: number;
    deploymentId: string;
    projectName: string;
  }>
> => {
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
    const projectName =
      (deployment.projectId as any)?.name || "Unknown Project";

    logs.forEach((logText: string, index: number) => {
      const timeMatch = logText.match(/\[(\d{2}):(\d{2}):(\d{2})\]/);
      let timestamp =
        new Date(deployment.createdAt).getTime() + (logs.length - index) * 1000;

      if (timeMatch) {
        const date = new Date(deployment.createdAt);
        date.setHours(
          parseInt(timeMatch[1], 10),
          parseInt(timeMatch[2], 10),
          parseInt(timeMatch[3], 10),
        );
        timestamp = date.getTime();
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

/**
 * Delete a project and ALL its deployments.
 *
 * Phase 4: also stops every running container and unregisters nginx routes
 * so nothing is left dangling after deletion.
 */
export const deleteProject = async (ownerId: string, projectId: string) => {
  const project = await ensureProjectOwnership(projectId, ownerId);

  // Tear down every deployment that has a live container or nginx route
  const deployments = await Deployment.find({ projectId: project._id });
  await Promise.allSettled(deployments.map(teardownDeployment));

  // Now delete all deployment records and the project itself
  await Deployment.deleteMany({
    projectId: project._id,
    ownerId: new Types.ObjectId(ownerId),
  });
  await project.deleteOne();
};

export const listDeployments = async (ownerId: string) =>
  Deployment.find({ ownerId: new Types.ObjectId(ownerId) })
    .sort({ createdAt: -1 })
    .populate("projectId", "name repoUrl framework branch");

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

  // Only block on genuinely in-progress statuses — stopped/failed are fine to redeploy
  if (project.activeDeploymentId) {
    const active = await Deployment.findOne({
      _id: project.activeDeploymentId,
      status: { $in: ["queued", "cloning", "building", "starting", "running"] },
    });
    if (active) {
      throw conflict("This project already has an active deployment");
    }
  }

  const deployment = await Deployment.create({
    projectId: project._id,
    ownerId: new Types.ObjectId(ownerId),
    status: "queued",
    repoUrl: project.repoUrl,
    branch: project.branch,
    logs: [],
    commitHash: null,
    subdomain: null,
    publicUrl: null,
    containerId: null,
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
    `Repository: ${project.repoUrl} (branch: ${project.branch}, root: ${project.rootDirectory})`,
  );
  await enqueueDeployment({
    deploymentId: deployment._id.toString(),
    projectId: project._id.toString(),
    ownerId,
  });

  return deployment;
};

/**
 * Stop a running deployment.
 *
 * Phase 4 fixes:
 *  1. Stops + removes the Docker container
 *  2. Unregisters the nginx subdomain route
 *  3. Clears project.activeDeploymentId so re-deploy is not blocked
 */
export const stopDeployment = async (ownerId: string, deploymentId: string) => {
  const deployment = await Deployment.findOne({
    _id: new Types.ObjectId(deploymentId),
    ownerId: new Types.ObjectId(ownerId),
  });
  if (!deployment) throw notFound("Deployment not found");

  // Tear down container + nginx route
  await teardownDeployment(deployment);

  deployment.status = "stopped";
  deployment.completedAt = new Date();
  deployment.errorMessage = null;
  await deployment.save();

  // FIX: clear activeDeploymentId on the project so next deploy isn't blocked
  await Project.updateOne(
    {
      _id: deployment.projectId,
      activeDeploymentId: deployment._id,
    },
    { $set: { activeDeploymentId: null } },
  );

  await appendDeploymentLog(
    deployment._id,
    "Deployment marked as stopped by user",
  );

  return deployment;
};
