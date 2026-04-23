import { Router, Request, Response } from "express";
import { authenticate } from "../middleware/authenticate";
import * as deployment from "../controllers/deployment.controller";
import { logStreamRegistry } from "../services/logStream.registry";
import * as projectService from "../services/project.service";
import jwt from "jsonwebtoken";

const router = Router();

// Debug logging for all routes
router.use((req, res, next) => {
  console.log(`📌 Deployment route: ${req.method} ${req.originalUrl}`);
  next();
});

// ============================================================
// ✅ SSE ROUTE - MUST BE BEFORE authenticate middleware
// ============================================================
router.get("/logs/stream", (req: Request, res: Response) => {
  console.log("📡 SSE stream request received", {
    query: req.query,
    hasToken: !!req.query.token,
  });

  let userId: string;

  // Handle authentication manually for SSE
  try {
    const token = req.query.token as string;

    if (!token) {
      console.log("❌ No token provided for SSE stream");
      res.status(401).json({ success: false, error: "Unauthorized" });
      return;
    }

    // Verify token and extract user ID
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
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

  // Send ping to keep connection alive
  const pingInterval = setInterval(() => {
    res.write(": ping\n\n");
  }, 15000);

  // Register for log streaming
  const registryKey = `${userId}:${deploymentId}`;
  console.log(`🔑 Registering SSE connection with key: ${registryKey}`);
  const unregister = logStreamRegistry.register(registryKey, send);

  // Replay existing logs
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

  // Cleanup on connection close
  req.on("close", () => {
    console.log(`🔌 SSE connection closed for key: ${registryKey}`);
    clearInterval(pingInterval);
    unregister();
  });
});

// ============================================================
// ❌ AUTHENTICATION MIDDLEWARE - Applied to all routes below
// ============================================================
router.use(authenticate);

// ============================================================
// Protected routes (require authentication)
// ============================================================
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
