import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import * as searchController from "./search.controller";

const router = Router();

router.get("/", authenticate, searchController.search);

export default router;

