/**
 * env.service.ts  (Phase 5)
 *
 * Thin service layer for environment variable operations.
 * Business logic lives here; the controller stays thin.
 *
 * Security notes:
 *  - Values are NEVER returned to the frontend in plaintext via GET.
 *  - The mask "••••••••" is used for display.
 *  - Actual values are only written/read internally for deployments.
 */

import { Types } from "mongoose";
import { Project } from "../models/project.model";
import { conflict, notFound } from "../utils/errors";

const ENV_KEY_REGEX = /^[A-Za-z_][A-Za-z0-9_]*$/;
const MASKED_VALUE = "••••••••";

export interface MaskedEnvVar {
  key: string;
  maskedValue: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function validateKey(key: string): void {
  if (!key || key.trim().length === 0) {
    throw new Error("Environment variable key cannot be empty");
  }
  if (!ENV_KEY_REGEX.test(key.trim())) {
    throw new Error(
      "Key must start with a letter or underscore and contain only letters, digits, or underscores",
    );
  }
  if (key.length > 100) {
    throw new Error("Key must be 100 characters or fewer");
  }
}

function validateValue(value: string): void {
  if (value === undefined || value === null) {
    throw new Error("Environment variable value cannot be null");
  }
  if (value.length > 2000) {
    throw new Error("Value must be 2000 characters or fewer");
  }
}

async function getOwnedProject(projectId: string, ownerId: string) {
  const project = await Project.findOne({
    _id: new Types.ObjectId(projectId),
    ownerId: new Types.ObjectId(ownerId),
  });
  if (!project) throw notFound("Project not found");
  return project;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Return all env vars with masked values. */
export async function listEnvVars(
  projectId: string,
  ownerId: string,
): Promise<MaskedEnvVar[]> {
  const project = await getOwnedProject(projectId, ownerId);
  return project.envVars.map((v) => ({
    key: v.key,
    maskedValue: MASKED_VALUE,
  }));
}

/** Add a new env var. Key must be unique within the project. */
export async function addEnvVar(
  projectId: string,
  ownerId: string,
  key: string,
  value: string,
): Promise<MaskedEnvVar[]> {
  validateKey(key);
  validateValue(value);

  const normalizedKey = key.trim().toUpperCase();
  const project = await getOwnedProject(projectId, ownerId);

  const exists = project.envVars.some((v) => v.key === normalizedKey);
  if (exists) {
    throw conflict(
      `Environment variable "${normalizedKey}" already exists. Use PATCH to update it.`,
    );
  }

  project.envVars.push({ key: normalizedKey, value });
  await project.save();

  return project.envVars.map((v) => ({
    key: v.key,
    maskedValue: MASKED_VALUE,
  }));
}

/** Update an existing env var's value by key. */
export async function updateEnvVar(
  projectId: string,
  ownerId: string,
  key: string,
  value: string,
): Promise<MaskedEnvVar[]> {
  validateValue(value);

  const project = await getOwnedProject(projectId, ownerId);
  const idx = project.envVars.findIndex((v) => v.key === key);

  if (idx === -1) {
    throw notFound(`Environment variable "${key}" not found`);
  }

  project.envVars[idx].value = value;
  await project.save();

  return project.envVars.map((v) => ({
    key: v.key,
    maskedValue: MASKED_VALUE,
  }));
}

/** Delete an env var by key. */
export async function deleteEnvVar(
  projectId: string,
  ownerId: string,
  key: string,
): Promise<MaskedEnvVar[]> {
  const project = await getOwnedProject(projectId, ownerId);
  const originalLength = project.envVars.length;

  project.envVars = project.envVars.filter((v) => v.key !== key);

  if (project.envVars.length === originalLength) {
    throw notFound(`Environment variable "${key}" not found`);
  }

  await project.save();
  return project.envVars.map((v) => ({
    key: v.key,
    maskedValue: MASKED_VALUE,
  }));
}

export async function getRawEnvVars(
  projectId: string,
): Promise<Array<{ key: string; value: string }>> {
  const project = await Project.findById(new Types.ObjectId(projectId)).select(
    "envVars",
  );
  if (!project) return [];
  return project.envVars.map((v) => ({ key: v.key, value: v.value }));
}
