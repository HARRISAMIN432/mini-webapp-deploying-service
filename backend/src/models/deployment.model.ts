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

export interface IDeployment {
  _id: Types.ObjectId;
  projectId: Types.ObjectId;
  ownerId: Types.ObjectId;
  status: DeploymentStatus;
  repoUrl: string;
  branch: string;
  commitHash: string | null;
  logs: string[];
  publicUrl: string | null;
  containerId: string | null;
  port: number | null;
  startedAt: Date | null;
  completedAt: Date | null;
  errorMessage: string | null;
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
    commitHash: {
      type: String,
      default: null,
      trim: true,
    },
    logs: {
      type: [String],
      default: [],
    },
    publicUrl: {
      type: String,
      default: null,
      trim: true,
    },
    containerId: {
      type: String,
      default: null,
      trim: true,
    },
    port: {
      type: Number,
      default: null,
      min: [1, "Invalid port"],
      max: [65535, "Invalid port"],
    },
    startedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    errorMessage: {
      type: String,
      default: null,
      maxlength: [1000, "Error message too long"],
    },
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

export const Deployment = model<IDeployment, IDeploymentModel>(
  "Deployment",
  deploymentSchema,
);
