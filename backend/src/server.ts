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
import { bootstrapNginx } from "./services/nginx.service";

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
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/projects/deployments", deploymentRoutes);

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

  app.listen(env.PORT, () => {
    logger.info(`API listening on port ${env.PORT}`);
  });
};

start().catch((err) => {
  logger.error("Failed to start server", { error: String(err) });
  process.exit(1);
});
