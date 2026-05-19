import { Router } from "express";
import rateLimit from "express-rate-limit";

import { createContactRequestHandler } from "./contact.controller";

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many contact requests, please try again later",
  },
});

const contactRouter = Router();

contactRouter.post("/", contactLimiter, createContactRequestHandler);

export default contactRouter;
