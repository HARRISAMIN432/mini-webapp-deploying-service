export type DeploymentStatus =
  | "queued"
  | "cloning"
  | "building"
  | "starting"
  | "running"
  | "failed"
  | "stopped";

export interface Project {
  _id: string;
  name: string;
  repoUrl: string;
  framework: string;
  branch: string;
  rootDirectory: string;
  installCommand: string;
  buildCommand: string;
  outputDirectory: string;
  envVars: Array<{ key: string; value: string }>;
  ownerId: string;
  activeDeploymentId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Deployment {
  _id: string;
  projectId:
    | string
    | {
        _id: string;
        name: string;
        repoUrl: string;
        framework: string;
        branch: string;
      };
  ownerId: string;
  status: DeploymentStatus;
  repoUrl: string;
  branch: string;
  commitHash: string | null;
  logs: string[];
  publicUrl: string | null;
  containerId: string | null;
  port: number | null;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectPayload {
  name: string;
  repoUrl: string;
  framework: string;
  branch: string;
}
