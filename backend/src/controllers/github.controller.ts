import { Request, Response } from "express";
import type { AccessTokenPayload } from "../types";
import { sendSuccess } from "../utils/response";
import * as githubService from "../services/github.service";

const getUserId = (req: Request): string =>
    (req.user as AccessTokenPayload).sub;

/** GET /api/github/status */
export const getGithubStatus = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const status = await githubService.getGithubStatus(getUserId(req));
    sendSuccess(res, status);
};

/** POST /api/github/disconnect */
export const disconnectGithub = async (
    req: Request,
    res: Response,
): Promise<void> => {
    await githubService.disconnectGithub(getUserId(req));
    sendSuccess(res, null, "GitHub account disconnected");
};

/** GET /api/github/repos?page=1&search=&perPage=20 */
export const listRepos = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const page = parseInt(req.query.page as string) || 1;
    const perPage = Math.min(
        parseInt(req.query.perPage as string) || 20,
        100,
    );
    const search = (req.query.search as string) ?? "";

    const result = await githubService.listGithubRepos(
        getUserId(req),
        page,
        perPage,
        search,
    );
    sendSuccess(res, result);
};