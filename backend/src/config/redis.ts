import Redis from "ioredis";
import { env } from "./env";
import { logger } from "../utils/logger";

const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  enableReadyCheck: true,
});

redis.on("error", (err) => logger.error("Redis error", { error: err.message }));
redis.on("connect", () => logger.info("Redis connected"));
redis.on("reconnecting", () => logger.warn("Redis reconnecting…"));

export const connectRedis = async (): Promise<void> => {
  await redis.connect();
};

export { redis };
