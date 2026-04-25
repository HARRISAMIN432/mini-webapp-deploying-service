import { Request, Response } from "express";
import type { AccessTokenPayload } from "../types";
import { sendCreated, sendSuccess } from "../utils/response";
import * as projectService from "../services/project.service";
import type {
  CreateProjectInput,
  UpdateProjectInput,
} from "../validators/project.validators";

const getUserId = (req: Request): string => {
  const user = req.user as AccessTokenPayload;
  return user.sub;
};

const getProjectId = (req: Request): string =>
  Array.isArray(req.params.projectId)
    ? req.params.projectId[0]
    : req.params.projectId;

export const listProjects = async (req: Request, res: Response) => {
  const projects = await projectService.listProjects(getUserId(req));
  sendSuccess(res, projects);
};

export const createProject = async (req: Request, res: Response) => {
  console.log("createProject called", req.body); // add this
  const project = await projectService.createProject(
    getUserId(req),
    req.body as CreateProjectInput,
  );
  console.log("Project", project);
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
    {
      deploymentId: deployment._id.toString(),
      status: deployment.status,
    },
    "Deployment queued",
    201,
  );
};
