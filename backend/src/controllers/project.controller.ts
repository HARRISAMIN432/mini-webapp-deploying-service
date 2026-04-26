/**
 * project.controller.ts  (Phase 5)
 *
 * New handlers:
 *  - getProjectDetails
 *  - updateProjectSettings
 *  - listProjectDeployments
 *  - redeployProject
 *  - rollbackToDeployment
 *  - getProjectMetrics
 *  - getProjectDomains
 *  - listEnvVars / addEnvVar / updateEnvVar / deleteEnvVar
 */

import { Request, Response } from "express";
import type { AccessTokenPayload } from "../types";
import { sendCreated, sendSuccess, sendError } from "../utils/response";
import * as projectService from "../services/project.service";
import * as envService from "../services/env.service";
import type {
  CreateProjectInput,
  UpdateProjectInput,
} from "../validators/project.validators";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getUserId = (req: Request): string =>
  (req.user as AccessTokenPayload).sub;

const getProjectId = (req: Request): string => {
  const projectId = req.params.projectId;
  // Handle both string and string[] cases
  if (Array.isArray(projectId)) {
    return projectId[0];
  }
  return projectId;
};

// ─── Existing handlers ────────────────────────────────────────────────────────

export const listProjects = async (req: Request, res: Response) => {
  const projects = await projectService.listProjects(getUserId(req));
  sendSuccess(res, projects);
};

export const createProject = async (req: Request, res: Response) => {
  const project = await projectService.createProject(
    getUserId(req),
    req.body as CreateProjectInput,
  );
  sendCreated(res, project, "Project created successfully");
};

export const getProject = async (req: Request, res: Response) => {
  const project = await projectService.getProject(
    getUserId(req),
    getProjectId(req),
  );
  sendSuccess(res, project);
};

export const updateProject = async (req: Request, res: Response) => {
  const project = await projectService.updateProject(
    getUserId(req),
    getProjectId(req),
    req.body as UpdateProjectInput,
  );
  sendSuccess(res, project, "Project updated successfully");
};

export const deleteProject = async (req: Request, res: Response) => {
  await projectService.deleteProject(getUserId(req), getProjectId(req));
  sendSuccess(res, null, "Project deleted successfully");
};

export const listDeployments = async (req: Request, res: Response) => {
  const deployments = await projectService.listDeployments(getUserId(req));
  sendSuccess(res, deployments);
};

export const createDeployment = async (req: Request, res: Response) => {
  const deployment = await projectService.createDeployment(
    getUserId(req),
    getProjectId(req),
  );
  sendSuccess(
    res,
    { deploymentId: deployment._id.toString(), status: deployment.status },
    "Deployment queued",
    201,
  );
};

// ─── Phase 5: New handlers ────────────────────────────────────────────────────

/** GET /api/projects/:projectId/details */
export const getProjectDetails = async (req: Request, res: Response) => {
  const details = await projectService.getProjectDetails(
    getUserId(req),
    getProjectId(req),
  );
  sendSuccess(res, details);
};

/** PATCH /api/projects/:projectId/settings */
export const updateProjectSettings = async (req: Request, res: Response) => {
  const project = await projectService.updateProjectSettings(
    getUserId(req),
    getProjectId(req),
    req.body,
  );
  sendSuccess(res, project, "Settings updated");
};

/** GET /api/projects/:projectId/deployments */
export const listProjectDeployments = async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const result = await projectService.listProjectDeployments(
    getUserId(req),
    getProjectId(req),
    page,
    limit,
  );
  sendSuccess(res, result);
};

/** POST /api/projects/:projectId/redeploy */
export const redeployProject = async (req: Request, res: Response) => {
  const deployment = await projectService.redeployProject(
    getUserId(req),
    getProjectId(req),
  );
  sendSuccess(
    res,
    { deploymentId: deployment._id.toString(), status: deployment.status },
    "Redeployment queued",
    201,
  );
};

/** POST /api/projects/:projectId/rollback/:deploymentId */
export const rollbackToDeployment = async (req: Request, res: Response) => {
  const targetId = req.params.deploymentId;
  if (!targetId || Array.isArray(targetId)) {
    return sendError(res, "deploymentId is required", "400", 400);
  }

  const deployment = await projectService.rollbackToDeployment(
    getUserId(req),
    getProjectId(req),
    targetId,
  );
  sendSuccess(
    res,
    { deploymentId: deployment._id.toString(), status: deployment.status },
    "Rollback queued",
    201,
  );
};

/** GET /api/projects/:projectId/metrics */
export const getProjectMetrics = async (req: Request, res: Response) => {
  const metrics = await projectService.getProjectMetrics(
    getUserId(req),
    getProjectId(req),
  );
  sendSuccess(res, metrics);
};

/** GET /api/projects/:projectId/domains */
export const getProjectDomains = async (req: Request, res: Response) => {
  const domains = await projectService.getProjectDomains(
    getUserId(req),
    getProjectId(req),
  );
  sendSuccess(res, domains);
};

// ─── Phase 5: Env Vars ───────────────────────────────────────────────────────

/** GET /api/projects/:projectId/env */
export const listEnvVars = async (req: Request, res: Response) => {
  const vars = await envService.listEnvVars(getProjectId(req), getUserId(req));
  sendSuccess(res, vars);
};

/** POST /api/projects/:projectId/env */
export const addEnvVar = async (req: Request, res: Response) => {
  const { key, value } = req.body;
  if (!key) return sendError(res, "key is required", "400", 400);
  if (value === undefined)
    return sendError(res, "value is required", "400", 400);

  const vars = await envService.addEnvVar(
    getProjectId(req),
    getUserId(req),
    key,
    value,
  );
  sendCreated(
    res,
    vars,
    "Environment variable added. Redeploy to apply changes.",
  );
};

/** PATCH /api/projects/:projectId/env/:key */
export const updateEnvVar = async (req: Request, res: Response) => {
  const { key } = req.params;
  const { value } = req.body;

  if (!key || Array.isArray(key)) {
    return sendError(res, "Invalid key parameter", "400", 400);
  }
  if (value === undefined)
    return sendError(res, "value is required", "400", 400);

  const vars = await envService.updateEnvVar(
    getProjectId(req),
    getUserId(req),
    key,
    value,
  );
  sendSuccess(
    res,
    vars,
    "Environment variable updated. Redeploy to apply changes.",
  );
};

/** DELETE /api/projects/:projectId/env/:key */
export const deleteEnvVar = async (req: Request, res: Response) => {
  const { key } = req.params;

  if (!key || Array.isArray(key)) {
    return sendError(res, "Invalid key parameter", "400", 400);
  }

  const vars = await envService.deleteEnvVar(
    getProjectId(req),
    getUserId(req),
    key,
  );
  sendSuccess(
    res,
    vars,
    "Environment variable deleted. Redeploy to apply changes.",
  );
};
