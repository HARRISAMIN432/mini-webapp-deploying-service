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
router.get("/:projectId", project.getProject);
router.patch(
  "/:projectId",
  validate(updateProjectSchema),
  project.updateProject,
);
router.delete("/:projectId", project.deleteProject);
router.post("/:projectId/deploy", project.createDeployment);

export default router;
