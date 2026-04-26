/**
 * project.route.ts  (Phase 5)
 *
 * New routes added:
 *   GET    /:projectId/details
 *   PATCH  /:projectId/settings
 *   GET    /:projectId/deployments
 *   POST   /:projectId/redeploy
 *   POST   /:projectId/rollback/:deploymentId
 *   GET    /:projectId/metrics
 *   GET    /:projectId/domains
 *   GET    /:projectId/env
 *   POST   /:projectId/env
 *   PATCH  /:projectId/env/:key
 *   DELETE /:projectId/env/:key
 */

import dotenv from "dotenv";
dotenv.config({ quiet: true });
import { Router, Request, Response } from "express";
import { authenticate } from "../middleware/authenticate";
import { validate } from "../middleware/validate";
import * as project from "../controllers/project.controller";
import {
  createProjectSchema,
  updateProjectSchema,
} from "../validators/project.validators";
import jwt from "jsonwebtoken";
import { logStreamRegistry } from "../services/logStream.registry";
import * as projectService from "../services/project.service";

const router = Router();

// ─── SSE route (BEFORE auth middleware) ──────────────────────────────────────

router.get("/deployments/logs/stream", (req: Request, res: Response) => {
  let userId: string;

  try {
    const token = req.query.token as string;
    if (!token) {
      res.status(401).json({ success: false, error: "Unauthorized" });
      return;
    }

    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as {
      id?: string;
      sub?: string;
    };
    userId = payload.id || payload.sub || "";
    if (!userId) {
      res.status(401).json({ success: false, error: "Invalid token payload" });
      return;
    }
  } catch {
    res.status(401).json({ success: false, error: "Invalid token" });
    return;
  }

  const deploymentId = req.query.deploymentId as string;
  if (!deploymentId) {
    res.status(400).json({ success: false, error: "deploymentId required" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    if (typeof (res as any).flush === "function") (res as any).flush();
  };

  const pingInterval = setInterval(() => res.write(": ping\n\n"), 15000);
  const registryKey = `${userId}:${deploymentId}`;
  const unregister = logStreamRegistry.register(registryKey, send);

  projectService
    .getLogsForDeployment(userId, deploymentId, 500)
    .then((logs) => {
      logs.forEach((entry) => send("log", entry));
      send("replay_done", { deploymentId });
    })
    .catch(() => {});

  req.on("close", () => {
    clearInterval(pingInterval);
    unregister();
  });
});

// ─── Auth middleware for all routes below ────────────────────────────────────

router.use(authenticate);

// ─── Core project CRUD ───────────────────────────────────────────────────────

router.get("/", project.listProjects);
router.post("/", validate(createProjectSchema), project.createProject);
router.get("/deployments", project.listDeployments);
router.get("/:projectId", project.getProject);
router.patch(
  "/:projectId",
  validate(updateProjectSchema),
  project.updateProject,
);
router.delete("/:projectId", project.deleteProject);

// ─── Deployment actions ──────────────────────────────────────────────────────

router.post("/:projectId/deploy", project.createDeployment);

// Phase 5
router.post("/:projectId/redeploy", project.redeployProject);
router.post("/:projectId/rollback/:deploymentId", project.rollbackToDeployment);

// ─── Phase 5: Project detail, settings, metrics, domains ─────────────────────

router.get("/:projectId/details", project.getProjectDetails);
router.patch("/:projectId/settings", project.updateProjectSettings);
router.get("/:projectId/deployments", project.listProjectDeployments);
router.get("/:projectId/metrics", project.getProjectMetrics);
router.get("/:projectId/domains", project.getProjectDomains);

// ─── Phase 5: Environment variables ──────────────────────────────────────────

router.get("/:projectId/env", project.listEnvVars);
router.post("/:projectId/env", project.addEnvVar);
router.patch("/:projectId/env/:key", project.updateEnvVar);
router.delete("/:projectId/env/:key", project.deleteEnvVar);

export default router;
