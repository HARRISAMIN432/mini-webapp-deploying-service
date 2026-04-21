import { Model, Schema, Types, model } from "mongoose";

export const deploymentStatuses = [
  "queued",
  "building",
  "running",
  "failed",
] as const;

export type DeploymentStatus = (typeof deploymentStatuses)[number];

export interface IDeployment {
  _id: Types.ObjectId;
  projectId: Types.ObjectId;
  ownerId: Types.ObjectId;
  status: DeploymentStatus;
  logs: string[];
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
    logs: {
      type: [String],
      default: [],
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

export const Deployment = model<IDeployment, IDeploymentModel>(
  "Deployment",
  deploymentSchema,
);
