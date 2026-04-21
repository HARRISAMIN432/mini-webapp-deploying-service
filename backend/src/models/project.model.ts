import { Model, Schema, Types, model } from "mongoose";

export interface IProject {
  _id: Types.ObjectId;
  name: string;
  repoUrl: string;
  framework: string;
  branch: string;
  ownerId: Types.ObjectId;
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
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
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

projectSchema.index({ ownerId: 1, createdAt: -1 });
projectSchema.index({ ownerId: 1, name: 1 }, { unique: true });

export const Project = model<IProject, IProjectModel>("Project", projectSchema);
