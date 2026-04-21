export type DeploymentStatus = "queued" | "building" | "running" | "failed";

export interface Project {
  _id: string;
  name: string;
  repoUrl: string;
  framework: string;
  branch: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Deployment {
  _id: string;
  projectId: string;
  ownerId: string;
  status: DeploymentStatus;
  logs: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectPayload {
  name: string;
  repoUrl: string;
  framework: string;
  branch: string;
}
