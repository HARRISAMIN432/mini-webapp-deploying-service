import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import * as github from "../controllers/github.controller";

const router = Router();

// All GitHub routes require authentication
router.use(authenticate);

router.get("/status", github.getGithubStatus);
router.post("/disconnect", github.disconnectGithub);
router.get("/repos", github.listRepos);

export default router;