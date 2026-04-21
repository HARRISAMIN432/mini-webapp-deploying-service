import { Types } from "mongoose";
import { Deployment } from "../models/deployment.model";
import { Project } from "../models/project.model";
import { conflict, notFound } from "../utils/errors";
import type {
  CreateProjectInput,
  UpdateProjectInput,
} from "../validators/project.validators";

const ensureProjectOwnership = async (projectId: string, ownerId: string) => {
  const project = await Project.findOne({
    _id: new Types.ObjectId(projectId),
    ownerId: new Types.ObjectId(ownerId),
  });

  if (!project) throw notFound("Project not found");
  return project;
};

export const listProjects = async (ownerId: string) =>
  Project.find({ ownerId: new Types.ObjectId(ownerId) }).sort({ createdAt: -1 });

export const createProject = async (ownerId: string, input: CreateProjectInput) => {
  const existing = await Project.findOne({
    ownerId: new Types.ObjectId(ownerId),
    name: input.name,
  });
  if (existing) throw conflict("A project with this name already exists");

  return Project.create({
    ...input,
    ownerId: new Types.ObjectId(ownerId),
  });
};

export const getProject = async (ownerId: string, projectId: string) =>
  ensureProjectOwnership(projectId, ownerId);

export const updateProject = async (
  ownerId: string,
  projectId: string,
  input: UpdateProjectInput,
) => {
  const project = await ensureProjectOwnership(projectId, ownerId);

  if (input.name && input.name !== project.name) {
    const duplicate = await Project.findOne({
      ownerId: new Types.ObjectId(ownerId),
      name: input.name,
      _id: { $ne: project._id },
    });
    if (duplicate) throw conflict("A project with this name already exists");
  }

  Object.assign(project, input);
  await project.save();
  return project;
};

export const deleteProject = async (ownerId: string, projectId: string) => {
  const project = await ensureProjectOwnership(projectId, ownerId);
  await Deployment.deleteMany({
    projectId: project._id,
    ownerId: new Types.ObjectId(ownerId),
  });
  await project.deleteOne();
};

export const listDeployments = async (ownerId: string) =>
  Deployment.find({ ownerId: new Types.ObjectId(ownerId) }).sort({ createdAt: -1 });

export const createDeployment = async (ownerId: string, projectId: string) => {
  const project = await ensureProjectOwnership(projectId, ownerId);

  const deployment = await Deployment.create({
    projectId: project._id,
    ownerId: new Types.ObjectId(ownerId),
    status: "queued",
    logs: [
      "Deployment queued",
      `Repository: ${project.repoUrl}`,
      `Branch: ${project.branch}`,
    ],
  });

  // Simulated deployment progression for the MVP dashboard.
  setTimeout(async () => {
    await Deployment.findByIdAndUpdate(deployment._id, {
      status: "building",
      $push: { logs: "Build started" },
    });
  }, 1500);

  setTimeout(async () => {
    await Deployment.findByIdAndUpdate(deployment._id, {
      status: "running",
      $push: { logs: "Deployment is now running" },
    });
  }, 4500);

  return deployment;
};
