import dotenv from "dotenv";
dotenv.config({ quiet: true });
import "express-async-errors";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import "./types";
import { env } from "./config/env";
import { connectDB } from "./config/database";
import { connectRedis } from "./config/redis";
import { logger } from "./utils/logger";
import { errorHandler } from "./middleware/error-handler";
import authRoutes from "./routes/auth.route";
import projectRoutes from "./routes/project.route";
import deploymentRoutes from "./routes/deployment.route";
import webhookRoutes from "./routes/webhook.route"; // Phase 5
import { bootstrapNginx } from "./services/nginx.service";
import { startHealthMonitor } from "./services/health.service"; // Phase 5

const app = express();

app.set("trust proxy", 1);

app.use(helmet());
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  }),
);
app.use(cookieParser());

// Webhook route needs raw body for signature verification — register BEFORE express.json()
app.use(
  "/api/webhooks",
  express.raw({ type: "application/json" }),
  (req, _res, next) => {
    // Re-parse so downstream middleware gets a JS object
    if (Buffer.isBuffer(req.body)) {
      try {
        req.body = JSON.parse(req.body.toString("utf-8"));
      } catch {
        req.body = {};
      }
    }
    next();
  },
);

app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/projects/deployments", deploymentRoutes);
app.use("/api/webhooks", webhookRoutes); // Phase 5

app.use(errorHandler);

const start = async (): Promise<void> => {
  await connectRedis();
  await connectDB();

  try {
    await bootstrapNginx();
    logger.info("Nginx routes bootstrapped from persisted registry");
  } catch (err) {
    logger.warn("Nginx bootstrap skipped (nginx may not be running yet)", {
      error: String(err),
    });
  }

  // Phase 5: start background health monitor
  startHealthMonitor();

  app.listen(env.PORT, () => {
    logger.info(`API listening on port ${env.PORT}`);
  });
};

start().catch((err) => {
  logger.error("Failed to start server", { error: String(err) });
  process.exit(1);
});
