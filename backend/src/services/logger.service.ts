import { Types } from "mongoose";
import { Deployment } from "../models/deployment.model";
import { logStreamRegistry } from "./logStream.registry";
import type { DeploymentStatus } from "../types";

export const appendDeploymentLog = async (
  deploymentId: Types.ObjectId | string,
  text: string,
): Promise<void> => {
  const timestamp = new Date().toISOString().slice(11, 19); // HH:MM:SS
  const line = `[${timestamp}] ${text}`;

  const deployment = await Deployment.findByIdAndUpdate(
    deploymentId,
    { $push: { logs: line } },
    { new: false }, // we just need ownerId, not the updated doc
  ).select("ownerId");

  if (!deployment) return;

  const ownerId = deployment.ownerId.toString();
  const depId = deploymentId.toString();

  const logEntry = {
    id: `${depId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    text: line,
    timestamp: Date.now(),
    deploymentId: depId,
  };

  // Emit on scoped key AND legacy global key
  logStreamRegistry.emitToDeployment(ownerId, depId, "log", logEntry);
};

/**
 * Update a deployment's status and optional fields, then emit a `status`
 * event on the deployment-scoped SSE channel.
 */
export const setDeploymentStatus = async (
  deploymentId: Types.ObjectId | string,
  status: DeploymentStatus,
  extra: Partial<{
    commitHash: string | null;
    publicUrl: string | null;
    containerId: string | null;
    port: number | null;
    startedAt: Date | null;
    completedAt: Date | null;
    errorMessage: string | null;
  }> = {},
): Promise<void> => {
  const deployment = await Deployment.findByIdAndUpdate(
    deploymentId,
    { $set: { status, ...extra } },
    { new: true },
  ).select("ownerId status publicUrl errorMessage commitHash");

  if (!deployment) return;

  const ownerId = deployment.ownerId.toString();
  const depId = deploymentId.toString();

  const statusEvent = {
    deploymentId: depId,
    status: deployment.status,
    publicUrl: deployment.publicUrl ?? null,
    errorMessage: deployment.errorMessage ?? null,
    commitHash: deployment.commitHash ?? null,
    ...extra,
  };

  logStreamRegistry.emitToDeployment(ownerId, depId, "status", statusEvent);
};
