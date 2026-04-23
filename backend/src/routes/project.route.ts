// project.route.ts
import dotenv from "dotenv";
dotenv.config(); // Load environment variables
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

// ✅ SSE route FIRST - before authentication
router.get("/deployments/logs/stream", (req: Request, res: Response) => {
  console.log("📡 SSE stream request received", {
    query: req.query,
    hasToken: !!req.query.token,
  });

  let userId: string;

  try {
    const token = req.query.token as string;

    if (!token) {
      console.log("❌ No token provided for SSE stream");
      res.status(401).json({ success: false, error: "Unauthorized" });
      return;
    }

    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as {
      id?: string;
      sub?: string;
    };

    userId = payload.id || payload.sub || "";

    if (!userId) {
      console.log("❌ No user ID found in token payload", { payload });
      res.status(401).json({ success: false, error: "Invalid token payload" });
      return;
    }

    console.log(`✅ SSE stream authenticated for user ${userId}`);
  } catch (err) {
    console.error("❌ Token verification failed:", err);
    res.status(401).json({ success: false, error: "Invalid token" });
    return;
  }

  const deploymentId = req.query.deploymentId as string;
  if (!deploymentId) {
    console.log("❌ No deploymentId provided");
    res.status(400).json({ success: false, error: "deploymentId required" });
    return;
  }

  console.log(`📡 Setting up SSE stream for deployment: ${deploymentId}`);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    if (typeof (res as any).flush === "function") {
      (res as any).flush();
    }
  };

  const pingInterval = setInterval(() => {
    res.write(": ping\n\n");
  }, 15000);

  const registryKey = `${userId}:${deploymentId}`;
  console.log(`🔑 Registering SSE connection with key: ${registryKey}`);
  const unregister = logStreamRegistry.register(registryKey, send);

  projectService
    .getLogsForDeployment(userId, deploymentId, 500)
    .then((logs) => {
      console.log(
        `📜 Replaying ${logs.length} logs for deployment ${deploymentId}`,
      );
      logs.forEach((entry) => send("log", entry));
      send("replay_done", { deploymentId });
    })
    .catch((err) => {
      console.error(`❌ Failed to replay logs:`, err);
    });

  req.on("close", () => {
    console.log(`🔌 SSE connection closed for key: ${registryKey}`);
    clearInterval(pingInterval);
    unregister();
  });
});

// ❌ Now apply authentication for all other routes
router.use(authenticate);

// Regular project routes
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
router.post("/:projectId/deploy", project.createDeployment);

export default router;
