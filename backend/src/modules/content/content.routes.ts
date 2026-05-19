import { Router } from "express";

import {
  getBaristasHandler,
  getEventsHandler,
  getGalleryHandler,
  getHomeBentoHandler,
} from "./content.controller";

const contentRouter = Router();

contentRouter.get("/home-bento", getHomeBentoHandler);
contentRouter.get("/events", getEventsHandler);
contentRouter.get("/gallery", getGalleryHandler);
contentRouter.get("/baristas", getBaristasHandler);

export default contentRouter;
