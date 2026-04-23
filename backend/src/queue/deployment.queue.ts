import { Queue } from "bullmq";
import { queueConnection } from "./redis";

export const DEPLOY_PROJECT_JOB = "deploy-project";
export const DEPLOYMENT_QUEUE_NAME = "deployments";

export interface DeployProjectJobPayload {
  deploymentId: string;
  projectId: string;
  ownerId: string;
}

export const deploymentQueue = new Queue<DeployProjectJobPayload>(
  DEPLOYMENT_QUEUE_NAME,
  {
    connection: queueConnection,
    defaultJobOptions: {
      attempts: 1,
      removeOnComplete: 1000,
      removeOnFail: 1000,
    },
  },
);

export const enqueueDeployment = async (payload: DeployProjectJobPayload) =>
  deploymentQueue.add(DEPLOY_PROJECT_JOB, payload, {
    jobId: payload.deploymentId,
  });
