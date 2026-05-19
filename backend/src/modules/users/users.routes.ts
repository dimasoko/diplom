import { Router } from "express";

import { requireAuth } from "../../middleware/auth.middleware";
import { getMeHandler } from "./users.controller";

const usersRouter = Router();

usersRouter.get("/me", requireAuth, getMeHandler);

export default usersRouter;
