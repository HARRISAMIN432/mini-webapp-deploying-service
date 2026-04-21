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
});

export const updateProjectSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  repoUrl: githubRepoUrlField.optional(),
  framework: z.string().trim().min(2).max(100).optional(),
  branch: z.string().trim().min(1).max(100).optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
