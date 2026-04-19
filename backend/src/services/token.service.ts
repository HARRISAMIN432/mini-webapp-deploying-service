import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import ms from "ms";
import { env } from "../config/env";
import { redis } from "../config/redis";
import { AccessTokenPayload, RefreshTokenPayload, TokenPair } from "../types";
import { unauthorized, tokenReuse } from "../utils/errors";
import { logger } from "../utils/logger";

const AT_BLACKLIST = "at:bl:";
const RT_FAMILY = "rt:family:";
const RT_VALID = "rt:valid:";

export const issueTokenPair = async (
  userId: string,
  email: string,
  name: string,
  rememberMe = false,
): Promise<TokenPair> => {
  const accessJti = uuidv4();
  const familyId = uuidv4();
  const refreshExpiry = rememberMe ? "90d" : env.JWT_REFRESH_EXPIRES_IN;

  const accessToken = jwt.sign(
    { sub: userId, email, name, jti: accessJti },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRES_IN as ms.StringValue },
  );

  const refreshToken = jwt.sign(
    { sub: userId, jti: familyId },
    env.JWT_REFRESH_SECRET,
    { expiresIn: refreshExpiry as ms.StringValue },
  );

  const ttl = Math.floor(ms(refreshExpiry as ms.StringValue) / 1000);
  await redis.setex(`${RT_VALID}${familyId}`, ttl, refreshToken);
  await redis.setex(`${RT_FAMILY}${familyId}`, ttl, userId);

  return {
    accessToken,
    refreshToken,
    expiresIn: Math.floor(
      ms(env.JWT_ACCESS_EXPIRES_IN as ms.StringValue) / 1000,
    ),
  };
};

export const rotateAndIssueTokenPair = async (
  incomingRefreshToken: string,
  getUserData: (userId: string) => Promise<{ email: string; name: string }>,
): Promise<TokenPair> => {
  const payload = extractRefreshPayload(incomingRefreshToken);
  const { sub: userId, jti: familyId } = payload;

  const storedToken = await redis.get(`${RT_VALID}${familyId}`);
  if (!storedToken) throw unauthorized("Refresh token has been revoked");

  if (storedToken !== incomingRefreshToken) {
    await revokeFamily(familyId);
    logger.warn("Refresh token reuse detected", { userId, familyId });
    throw tokenReuse();
  }

  await revokeFamily(familyId);
  const { email, name } = await getUserData(userId);
  return issueTokenPair(userId, email, name);
};

export const verifyAccessToken = async (
  token: string,
): Promise<AccessTokenPayload> => {
  let payload: AccessTokenPayload;
  try {
    payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError)
      throw unauthorized("Access token expired");
    throw unauthorized("Invalid access token");
  }
  const isRevoked = await redis.exists(`${AT_BLACKLIST}${payload.jti}`);
  if (isRevoked) throw unauthorized("Access token has been revoked");
  return payload;
};

export const revokeAccessToken = async (
  jti: string,
  expiresAt: number,
): Promise<void> => {
  const ttl = expiresAt - Math.floor(Date.now() / 1000);
  if (ttl > 0) await redis.setex(`${AT_BLACKLIST}${jti}`, ttl, "1");
};

export const revokeFamily = async (familyId: string): Promise<void> => {
  await redis.del(`${RT_VALID}${familyId}`);
  await redis.del(`${RT_FAMILY}${familyId}`);
};

export const revokeAllUserSessions = async (userId: string): Promise<void> => {
  const stream = redis.scanStream({ match: `${RT_FAMILY}*`, count: 100 });
  const pipeline = redis.pipeline();
  await new Promise<void>((resolve, reject) => {
    stream.on("data", async (keys: string[]) => {
      for (const key of keys) {
        const owner = await redis.get(key);
        if (owner === userId) {
          const familyId = key.replace(RT_FAMILY, "");
          pipeline.del(`${RT_VALID}${familyId}`);
          pipeline.del(key);
        }
      }
    });
    stream.on("end", resolve);
    stream.on("error", reject);
  });
  await pipeline.exec();
};

export const extractRefreshPayload = (token: string): RefreshTokenPayload => {
  try {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError)
      throw unauthorized("Refresh token expired");
    throw unauthorized("Invalid refresh token");
  }
};
