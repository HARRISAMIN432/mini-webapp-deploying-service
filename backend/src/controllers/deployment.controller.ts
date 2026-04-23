import { Request, Response } from "express";
import type { AccessTokenPayload } from "../types";
import { sendSuccess, sendError } from "../utils/response";
import * as projectService from "../services/project.service";

const getUserId = (req: Request): string => {
  const user = req.user as AccessTokenPayload;
  return user.sub;
};

const getDeploymentId = (req: Request): string =>
  Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

export const getDeployment = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const deploymentId = getDeploymentId(req);

    console.log(`🔍 Fetching deployment ${deploymentId} for user ${userId}`);

    const deployment = await projectService.getDeployment(userId, deploymentId);

    if (!deployment) {
      console.log(`❌ Deployment ${deploymentId} not found for user ${userId}`);
      return sendError(res, "Deployment not found", "404", 404);
    }

    console.log(
      `✅ Found deployment ${deploymentId} with status ${deployment.status}`,
    );
    sendSuccess(res, deployment);
  } catch (error) {
    console.error("❌ Error in getDeployment:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    sendError(res, message, "404", 404);
  }
};

export const stopDeployment = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const deploymentId = getDeploymentId(req);

    console.log(`🛑 Stopping deployment ${deploymentId} for user ${userId}`);

    const deployment = await projectService.stopDeployment(
      userId,
      deploymentId,
    );

    console.log(`✅ Deployment ${deploymentId} stopped successfully`);
    sendSuccess(res, deployment, "Deployment stopped");
  } catch (error) {
    console.error("❌ Error in stopDeployment:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    sendError(res, message, "404", 404);
  }
};
