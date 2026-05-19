import { Router } from "express";

import {
  logoutHandler,
  loginHandler,
  refreshHandler,
  registerHandler,
} from "./auth.controller";

const authRouter = Router();

authRouter.post("/register", registerHandler);
authRouter.post("/login", loginHandler);
authRouter.post("/refresh", refreshHandler);
authRouter.post("/logout", logoutHandler);

export default authRouter;
