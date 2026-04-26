/**
 * webhook.route.ts  (Phase 5)
 *
 * Handles inbound GitHub push webhooks.
 *
 * Security:
 *  - Optional HMAC-SHA256 signature verification (set GITHUB_WEBHOOK_SECRET env)
 *  - If secret is not set, signature check is skipped (dev mode)
 *  - Route is NOT behind authenticate middleware (public endpoint)
 */

import { Router, Request, Response } from "express";
import crypto from "crypto";
import * as projectService from "../services/project.service";
import { sendSuccess, sendError } from "../utils/response";
import { logger } from "../utils/logger";

const router = Router();

// ─── Signature verification ──────────────────────────────────────────────────

function verifyGitHubSignature(req: Request): boolean {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) return true; // dev mode: skip verification

  const signature = req.headers["x-hub-signature-256"] as string;
  if (!signature) return false;

  const hmac = crypto.createHmac("sha256", secret);
  const body = JSON.stringify(req.body);
  const digest = `sha256=${hmac.update(body).digest("hex")}`;

  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
  } catch {
    return false;
  }
}

// ─── Routes ──────────────────────────────────────────────────────────────────

/**
 * POST /api/webhooks/github
 *
 * GitHub sends this on every push event.
 * We match the repo URL + branch to a project with autoDeploy=true.
 */
router.post("/github", async (req: Request, res: Response) => {
  try {
    // Verify signature
    if (!verifyGitHubSignature(req)) {
      logger.warn("[webhook] Invalid GitHub signature");
      return sendError(res, "Invalid webhook signature", "401", 401);
    }

    const event = req.headers["x-github-event"] as string;

    // We only care about push events
    if (event !== "push") {
      return sendSuccess(res, {
        skipped: true,
        reason: `Event "${event}" is not handled`,
      });
    }

    const { repository, ref, head_commit, after } = req.body;

    if (!repository?.clone_url && !repository?.html_url) {
      return sendError(res, "Missing repository info in payload", "400", 400);
    }

    // Extract branch name from ref (e.g. "refs/heads/main" → "main")
    const pushedBranch = (ref as string)?.replace("refs/heads/", "") || "";
    const repoUrl = (repository.clone_url || repository.html_url) as string;
    const commitSha = (head_commit?.id || after || "") as string;

    logger.info(
      `[webhook] Push to ${repoUrl} on branch "${pushedBranch}" (${commitSha.slice(0, 7)})`,
    );

    const result = await projectService.triggerFromWebhook(
      repoUrl,
      pushedBranch,
      commitSha,
    );

    if (result.triggered) {
      logger.info(
        `[webhook] Auto-deploy triggered — project: ${result.projectId}, deployment: ${result.deploymentId}`,
      );
    } else {
      logger.info(
        "[webhook] No matching autoDeploy project found or deploy already in progress",
      );
    }

    return sendSuccess(res, result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Webhook processing error";
    logger.error("[webhook] Error", { error: msg });
    return sendError(res, msg, "500", 500);
  }
});

export default router;
