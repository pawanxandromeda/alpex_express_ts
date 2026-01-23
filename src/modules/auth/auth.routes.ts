import { Router } from "express";
import * as controller from "./auth.controller";

const router = Router();

router.post("/login", controller.login);
router.post("/refresh", controller.refresh);
router.post("/logout", controller.logout);

export default router;
