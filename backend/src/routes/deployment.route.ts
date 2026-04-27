import { Router, Request, Response } from "express";
import { authenticate } from "../middleware/authenticate";
import * as deployment from "../controllers/deployment.controller";
import { logStreamRegistry } from "../services/logStream.registry";
import * as projectService from "../services/project.service";
import { Deployment } from "../models/deployment.model";
import jwt from "jsonwebtoken";

const router = Router();

router.use((req, res, next) => {
  console.log(`📌 Deployment route: ${req.method} ${req.originalUrl}`);
  next();
});

router.get("/logs/stream", (req: Request, res: Response) => {
  console.log("[SSE Route] Stream request received", {
    query: {
      hasToken: !!req.query.token,
      hasDeploymentId: !!req.query.deploymentId,
      deploymentId: req.query.deploymentId,
    },
  });

  let userId: string;
  let deploymentId: string;

  // Validate inputs
  try {
    const token = req.query.token as string;
    deploymentId = req.query.deploymentId as string;

    if (!token) {
      console.log("[SSE Route] No token provided");
      res.status(401).json({ success: false, error: "Token required" });
      return;
    }

    if (!deploymentId) {
      console.log("[SSE Route] No deploymentId provided");
      res.status(400).json({ success: false, error: "deploymentId required" });
      return;
    }

    // Try both possible secret keys
    let payload: { id?: string; sub?: string } | null = null;

    try {
      payload = jwt.verify(token, process.env.ACCESS_SECRET!) as any;
    } catch {
      try {
        payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as any;
      } catch {
        throw new Error("Token verification failed with both secrets");
      }
    }

    if (!payload) {
      throw new Error("No payload extracted from token");
    }

    userId = payload.id || payload.sub || "";

    if (!userId) {
      console.log("[SSE Route] No user ID in token payload", { payload });
      res.status(401).json({ success: false, error: "Invalid token payload" });
      return;
    }

    console.log(`[SSE Route] Authenticated user: ${userId}`);
  } catch (err) {
    console.error("[SSE Route] Authentication failed:", err);
    res.status(401).json({ success: false, error: "Invalid token" });
    return;
  }

  // Verify deployment belongs to user
  Deployment.findById(deploymentId)
    .then((deployment) => {
      if (!deployment || deployment.ownerId.toString() !== userId) {
        console.log("[SSE Route] Deployment not found or unauthorized");
        res.status(404).json({ success: false, error: "Deployment not found" });
        return;
      }

      console.log(
        `[SSE Route] Setting up SSE stream for deployment: ${deploymentId}`,
      );

      // Set SSE headers
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

      // Send initial connection event
      send("connected", { deploymentId, timestamp: Date.now() });

      // Send ping to keep connection alive
      const pingInterval = setInterval(() => {
        res.write(": ping\n\n");
      }, 15000);

      // Register for log streaming
      const registryKey = `${userId}:${deploymentId}`;
      console.log(`[SSE Route] Registering with key: ${registryKey}`);
      const unregister = logStreamRegistry.register(registryKey, send);

      // Replay existing logs
      projectService
        .getLogsForDeployment(userId, deploymentId, 500)
        .then((logs) => {
          console.log(`[SSE Route] Replaying ${logs.length} logs`);
          logs.forEach((entry) => send("log", entry));
          send("replay_done", { deploymentId });
        })
        .catch((err) => {
          console.error(`[SSE Route] Failed to replay logs:`, err);
        });

      // Cleanup on connection close
      req.on("close", () => {
        console.log(`[SSE Route] Connection closed for key: ${registryKey}`);
        clearInterval(pingInterval);
        unregister();
      });
    })
    .catch((err) => {
      console.error("[SSE Route] Error finding deployment:", err);
      res.status(500).json({ success: false, error: "Internal server error" });
    });
});

router.use(authenticate);

router.get(
  "/:id",
  (req, res, next) => {
    console.log(`🔍 GET deployment: ${req.params.id}`);
    next();
  },
  deployment.getDeployment,
);

router.post(
  "/:id/stop",
  (req, res, next) => {
    console.log(`🛑 STOP deployment: ${req.params.id}`);
    next();
  },
  deployment.stopDeployment,
);

export default router;
