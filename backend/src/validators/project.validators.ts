import { z } from "zod";

const githubRepoUrlField = z
  .url("Repository URL must be a valid URL")
  .refine((url) => {
    try {
      return new URL(url).hostname.toLowerCase() === "github.com";
    } catch {
      return false;
    }
  }, "Only GitHub repository URLs are supported right now");

export const createProjectSchema = z.object({
  name: z.string().trim().min(2).max(120),
  repoUrl: githubRepoUrlField,
  framework: z.string().trim().min(2).max(100),
  branch: z.string().trim().min(1).max(100).default("main"),
  rootDirectory: z.string().trim().min(1).max(300).default("./"),
  installCommand: z.string().trim().min(1).max(300).default("npm install"),
  buildCommand: z.string().trim().min(1).max(300).default("npm run build"),
  outputDirectory: z.string().trim().min(1).max(300).default("dist"),
  envVars: z
    .array(
      z.object({
        key: z.string().trim().min(1).max(100),
        value: z.string().max(2000),
      }),
    )
    .default([]),

  // Phase 6 additions
  repoSource: z.enum(["github", "manual"]).default("manual"),
  repoFullName: z.string().max(300).optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  repoUrl: githubRepoUrlField.optional(),
  framework: z.string().trim().min(2).max(100).optional(),
  branch: z.string().trim().min(1).max(100).optional(),
  rootDirectory: z.string().trim().min(1).max(300).optional(),
  installCommand: z.string().trim().min(1).max(300).optional(),
  buildCommand: z.string().trim().min(1).max(300).optional(),
  outputDirectory: z.string().trim().min(1).max(300).optional(),
  envVars: z
    .array(
      z.object({
        key: z.string().trim().min(1).max(100),
        value: z.string().max(2000),
      }),
    )
    .optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;