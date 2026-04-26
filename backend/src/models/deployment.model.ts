/**
 * deployment.model.ts  (Phase 5)
 *
 * Added fields vs Phase 4:
 *   - healthStatus: "healthy" | "unhealthy" | "unknown"
 *   - lastHealthCheckAt: Date
 *   - consecutiveFailures: number
 *   - triggerSource: "manual" | "webhook" | "rollback" | "redeploy"
 *   - imageTag: string | null  — stored so rollback can reuse it
 */

import { Model, Schema, Types, model } from "mongoose";

export const deploymentStatuses = [
  "queued",
  "cloning",
  "building",
  "starting",
  "running",
  "failed",
  "stopped",
] as const;

export type DeploymentStatus = (typeof deploymentStatuses)[number];
export type HealthStatus = "healthy" | "unhealthy" | "unknown";
export type TriggerSource = "manual" | "webhook" | "rollback" | "redeploy";

export interface IDeployment {
  _id: Types.ObjectId;
  projectId: Types.ObjectId;
  ownerId: Types.ObjectId;
  status: DeploymentStatus;
  repoUrl: string;
  branch: string;
  commitHash: string | null;
  logs: string[];
  subdomain: string | null;
  publicUrl: string | null;
  containerId: string | null;
  imageTag: string | null; // Phase 5: stored for rollback reuse
  port: number | null;
  startedAt: Date | null;
  completedAt: Date | null;
  errorMessage: string | null;
  // ── Phase 5 additions ──────────────────────────────────────────────────────
  healthStatus: HealthStatus;
  lastHealthCheckAt: Date | null;
  consecutiveFailures: number;
  triggerSource: TriggerSource;
  // ──────────────────────────────────────────────────────────────────────────
  createdAt: Date;
  updatedAt: Date;
}

export interface IDeploymentModel extends Model<IDeployment> {}

const deploymentSchema = new Schema<IDeployment, IDeploymentModel>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: deploymentStatuses,
      required: true,
      default: "queued",
    },
    repoUrl: {
      type: String,
      required: true,
      trim: true,
      maxlength: [500, "Repository URL is too long"],
    },
    branch: {
      type: String,
      required: true,
      trim: true,
      default: "main",
      maxlength: [100, "Branch is too long"],
    },
    commitHash: { type: String, default: null, trim: true },
    logs: { type: [String], default: [] },
    subdomain: {
      type: String,
      default: null,
      trim: true,
      maxlength: [63, "Subdomain too long"],
      index: true,
    },
    publicUrl: { type: String, default: null, trim: true },
    containerId: { type: String, default: null, trim: true },
    imageTag: { type: String, default: null, trim: true },
    port: {
      type: Number,
      default: null,
      min: [1, "Invalid port"],
      max: [65535, "Invalid port"],
    },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    errorMessage: {
      type: String,
      default: null,
      maxlength: [1000, "Error message too long"],
    },
    // ── Phase 5 ──────────────────────────────────────────────────────────────
    healthStatus: {
      type: String,
      enum: ["healthy", "unhealthy", "unknown"],
      default: "unknown",
    },
    lastHealthCheckAt: { type: Date, default: null },
    consecutiveFailures: { type: Number, default: 0, min: 0 },
    triggerSource: {
      type: String,
      enum: ["manual", "webhook", "rollback", "redeploy"],
      default: "manual",
    },
    // ─────────────────────────────────────────────────────────────────────────
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: { __v?: number }) => {
        delete ret.__v;
        return ret;
      },
    },
  },
);

deploymentSchema.index({ ownerId: 1, createdAt: -1 });
deploymentSchema.index({ projectId: 1, createdAt: -1 });
deploymentSchema.index({ status: 1, createdAt: -1 });
deploymentSchema.index({ status: 1, healthStatus: 1 });

export const Deployment = model<IDeployment, IDeploymentModel>(
  "Deployment",
  deploymentSchema,
);
