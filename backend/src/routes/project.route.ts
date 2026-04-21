import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { validate } from "../middleware/validate";
import * as project from "../controllers/project.controller";
import {
  createProjectSchema,
  updateProjectSchema,
} from "../validators/project.validators";

const router = Router();

router.use(authenticate);

router.get("/", project.listProjects);
router.post("/", validate(createProjectSchema), project.createProject);
router.get("/deployments", project.listDeployments);
router.get("/:id", project.getProject);
router.patch("/:id", validate(updateProjectSchema), project.updateProject);
router.delete("/:id", project.deleteProject);
router.post("/:id/deploy", project.createDeployment);

export default router;
