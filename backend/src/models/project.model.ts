/**
 * project.model.ts  (Phase 5)
 *
 * Added fields vs Phase 4:
 *   - autoDeploy: boolean         — enable webhook-triggered deploys
 *   - trackedBranch: string       — which branch to watch for auto-deploy
 *   - startCommand: string        — user-overrideable start command
 */

import { Model, Schema, Types, model } from "mongoose";

export interface IEnvVar {
  key: string;
  value: string;
}

export interface IProject {
  _id: Types.ObjectId;
  name: string;
  repoUrl: string;
  framework: string;
  branch: string;
  rootDirectory: string;
  installCommand: string;
  buildCommand: string;
  startCommand: string; // Phase 5
  outputDirectory: string;
  envVars: IEnvVar[];
  ownerId: Types.ObjectId;
  activeDeploymentId: Types.ObjectId | null;
  // ── Phase 5 additions ──────────────────────────────────────────────────────
  autoDeploy: boolean;
  trackedBranch: string;
  // ──────────────────────────────────────────────────────────────────────────
  createdAt: Date;
  updatedAt: Date;
}

export interface IProjectModel extends Model<IProject> {}

const projectSchema = new Schema<IProject, IProjectModel>(
  {
    name: {
      type: String,
      required: [true, "Project name is required"],
      trim: true,
      minlength: [2, "Project name must be at least 2 characters"],
      maxlength: [120, "Project name must be at most 120 characters"],
    },
    repoUrl: {
      type: String,
      required: [true, "Repository URL is required"],
      trim: true,
      maxlength: [500, "Repository URL is too long"],
    },
    framework: {
      type: String,
      required: [true, "Framework is required"],
      trim: true,
      minlength: [2, "Framework is required"],
      maxlength: [100, "Framework is too long"],
    },
    branch: {
      type: String,
      required: [true, "Branch is required"],
      trim: true,
      default: "main",
      maxlength: [100, "Branch is too long"],
    },
    rootDirectory: {
      type: String,
      required: true,
      trim: true,
      default: "./",
      maxlength: [300, "Root directory is too long"],
    },
    installCommand: {
      type: String,
      required: true,
      trim: true,
      default: "npm install",
      maxlength: [300, "Install command is too long"],
    },
    buildCommand: {
      type: String,
      required: true,
      trim: true,
      default: "npm run build",
      maxlength: [300, "Build command is too long"],
    },
    startCommand: {
      type: String,
      trim: true,
      default: "",
      maxlength: [300, "Start command is too long"],
    },
    outputDirectory: {
      type: String,
      required: true,
      trim: true,
      default: "dist",
      maxlength: [300, "Output directory is too long"],
    },
    envVars: {
      type: [
        {
          key: {
            type: String,
            required: true,
            trim: true,
            maxlength: [100, "Environment variable key is too long"],
          },
          value: {
            type: String,
            required: true,
            maxlength: [2000, "Environment variable value is too long"],
          },
          _id: false,
        },
      ],
      default: [],
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    activeDeploymentId: {
      type: Schema.Types.ObjectId,
      ref: "Deployment",
      default: null,
      index: true,
    },
    // ── Phase 5 ──────────────────────────────────────────────────────────────
    autoDeploy: {
      type: Boolean,
      default: false,
    },
    trackedBranch: {
      type: String,
      trim: true,
      default: "main",
      maxlength: [100, "Tracked branch is too long"],
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

projectSchema.index({ ownerId: 1, createdAt: -1 });
projectSchema.index({ ownerId: 1, name: 1 }, { unique: true });
projectSchema.index({ repoUrl: 1 }); // Phase 5: webhook lookup by repoUrl

export const Project = model<IProject, IProjectModel>("Project", projectSchema);
