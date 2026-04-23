import { RedisOptions } from "ioredis";
import { env } from "../config/env";

export const queueConnection: RedisOptions = {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
  ...(new URL(env.REDIS_URL).protocol.startsWith("rediss")
    ? { tls: {} }
    : {}),
  host: new URL(env.REDIS_URL).hostname,
  port: Number(new URL(env.REDIS_URL).port || 6379),
  username: new URL(env.REDIS_URL).username || undefined,
  password: new URL(env.REDIS_URL).password || undefined,
  db: new URL(env.REDIS_URL).pathname
    ? Number(new URL(env.REDIS_URL).pathname.slice(1) || 0)
    : 0,
};
