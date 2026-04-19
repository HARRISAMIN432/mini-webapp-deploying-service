import crypto from "crypto";
import { redis } from "../config/redis";
import { env } from "../config/env";
import { OAuthProfile, OAuthProvider } from "../types";
import { unauthorized } from "../utils/errors";
import { logger } from "../utils/logger";

// ─── State Management (CSRF protection) ──────────────────────────────────────
const STATE_PREFIX = "oauth:state:";
const STATE_TTL = 600; // 10 minutes
const PKCE_VERIFIER_BYTES = 32;

type StoredOAuthState = {
  provider: OAuthProvider;
  redirectTo: string;
  codeVerifier?: string;
};

const base64UrlEncode = (buf: Buffer): string =>
  buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

const generatePkcePair = (): { verifier: string; challenge: string } => {
  const verifier = base64UrlEncode(crypto.randomBytes(PKCE_VERIFIER_BYTES));
  const challenge = base64UrlEncode(
    crypto.createHash("sha256").update(verifier).digest(),
  );
  return { verifier, challenge };
};

export const generateOAuthState = async (
  provider: OAuthProvider,
  redirectTo = "/",
): Promise<string> => {
  const state = crypto.randomBytes(32).toString("hex");
  const stored: StoredOAuthState = { provider, redirectTo };

  // GitHub recommends PKCE; keep verifier server-side (Redis).
  if (provider === "github") {
    const { verifier } = generatePkcePair();
    stored.codeVerifier = verifier;
  }

  await redis.setex(
    `${STATE_PREFIX}${state}`,
    STATE_TTL,
    JSON.stringify(stored),
  );
  return state;
};

export const consumeOAuthState = async (
  state: string,
): Promise<StoredOAuthState> => {
  const key = `${STATE_PREFIX}${state}`;
  const raw = await redis.get(key);
  if (!raw) throw unauthorized("Invalid or expired OAuth state");
  await redis.del(key);
  return JSON.parse(raw) as StoredOAuthState;
};

// ─── Authorization URL Builders ───────────────────────────────────────────────
export const buildGoogleAuthUrl = (state: string): string => {
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: env.GOOGLE_CALLBACK_URL,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "offline", // Request refresh token
    prompt: "select_account", // Force account picker
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
};

export const buildGithubAuthUrl = async (state: string): Promise<string> => {
  // Build PKCE challenge from the verifier we stored with the state.
  // If for some reason the verifier is missing, the flow still works without PKCE.
  const raw = await redis.get(`${STATE_PREFIX}${state}`);
  const stored = raw ? (JSON.parse(raw) as StoredOAuthState) : null;
  const challenge = stored?.codeVerifier
    ? base64UrlEncode(
        crypto.createHash("sha256").update(stored.codeVerifier).digest(),
      )
    : null;

  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    redirect_uri: env.GITHUB_CALLBACK_URL,
    scope: "read:user user:email",
    state,
    ...(challenge
      ? { code_challenge: challenge, code_challenge_method: "S256" }
      : {}),
  });
  return `https://github.com/login/oauth/authorize?${params}`;
};

// ─── Token Exchange ───────────────────────────────────────────────────────────
interface OAuthTokens {
  accessToken: string;
  refreshToken: string | null;
}

export const exchangeGoogleCode = async (
  code: string,
): Promise<OAuthTokens & { profile: OAuthProfile }> => {
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: env.GOOGLE_CALLBACK_URL,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    logger.error("Google token exchange failed", { err });
    throw unauthorized("Google OAuth failed: token exchange error");
  }

  const tokens = (await tokenRes.json()) as {
    access_token: string;
    refresh_token?: string;
    id_token?: string;
  };

  // Fetch user info using the access token
  const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!userRes.ok)
    throw unauthorized("Google OAuth failed: could not fetch user info");

  const userInfo = (await userRes.json()) as {
    sub: string;
    email: string;
    name: string;
    picture?: string;
    email_verified: boolean;
  };

  if (!userInfo.email_verified) {
    throw unauthorized("Google account email is not verified");
  }

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? null,
    profile: {
      providerId: userInfo.sub,
      provider: "google",
      email: userInfo.email,
      name: userInfo.name,
      avatarUrl: userInfo.picture,
    },
  };
};

export const exchangeGithubCode = async (
  code: string,
  codeVerifier?: string,
): Promise<OAuthTokens & { profile: OAuthProfile }> => {
  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      code,
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      redirect_uri: env.GITHUB_CALLBACK_URL,
      ...(codeVerifier ? { code_verifier: codeVerifier } : {}),
    }),
  });

  if (!tokenRes.ok)
    throw unauthorized("GitHub OAuth failed: token exchange error");

  const tokens = (await tokenRes.json()) as {
    access_token: string;
    error?: string;
  };

  if (tokens.error) throw unauthorized(`GitHub OAuth error: ${tokens.error}`);

  // Fetch GitHub user
  const userRes = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!userRes.ok)
    throw unauthorized("GitHub OAuth failed: could not fetch user info");
  const user = (await userRes.json()) as {
    id: number;
    name: string;
    login: string;
    avatar_url?: string;
  };

  // Fetch primary verified email (GitHub may not expose it in user endpoint)
  const emailsRes = await fetch("https://api.github.com/user/emails", {
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  let email = "";
  if (emailsRes.ok) {
    const emails = (await emailsRes.json()) as {
      email: string;
      primary: boolean;
      verified: boolean;
    }[];
    const primary = emails.find((e) => e.primary && e.verified);
    email = primary?.email ?? "";
  }

  if (!email)
    throw unauthorized("GitHub account has no verified primary email");

  return {
    accessToken: tokens.access_token,
    refreshToken: null,
    profile: {
      providerId: String(user.id),
      provider: "github",
      email,
      name: user.name ?? user.login,
      avatarUrl: user.avatar_url,
    },
  };
};
