import mongoose from "mongoose";
import { env } from "./env";
import { logger } from "../utils/logger";

mongoose.set("strict", true);
mongoose.set("strictQuery", true);

// ─── Connection options ───────────────────────────────────────────────────────
const MONGOOSE_OPTIONS: mongoose.ConnectOptions = {
  serverSelectionTimeoutMS: 5_000,
  socketTimeoutMS: 45_000,
  maxPoolSize: 20,
  minPoolSize: 2,
  connectTimeoutMS: 10_000,
};

// ─── Lifecycle Hooks ──────────────────────────────────────────────────────────
mongoose.connection.on("connected", () => logger.info("MongoDB connected"));
mongoose.connection.on("disconnected", () =>
  logger.warn("MongoDB disconnected"),
);
mongoose.connection.on("error", (err) =>
  logger.error("MongoDB error", { error: err.message }),
);

// ─── Connect ──────────────────────────────────────────────────────────────────
export const connectDB = async (): Promise<void> => {
  await mongoose.connect(env.MONGODB_URI, MONGOOSE_OPTIONS);
};

// ─── Graceful disconnect (used in tests / shutdown) ──────────────────────────
export const disconnectDB = async (): Promise<void> => {
  await mongoose.connection.close();
  logger.info("MongoDB disconnected gracefully");
};
