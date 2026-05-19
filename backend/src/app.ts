import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Application } from "express";
import path from "path";

import { errorHandler } from "./middleware/error-handler";
import adminRouter from "./modules/admin/admin.routes";
import authRouter from "./modules/auth/auth.routes";
import contactRouter from "./modules/contact/contact.routes";
import contentRouter from "./modules/content/content.routes";
import menuRouter from "./modules/menu/menu.routes";
import ordersRouter from "./modules/orders/orders.routes";
import pushRouter from "./modules/push/push.routes";
import usersRouter from "./modules/users/users.routes";

const corsOrigin = process.env.CORS_ORIGIN;

if (!corsOrigin) {
  throw new Error("CORS_ORIGIN is required in .env");
}

const app: Application = express();

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  }),
);

app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/menu", menuRouter);
app.use("/api/v1/content", contentRouter);
app.use("/api/v1/orders", ordersRouter);
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/contact", contactRouter);
app.use("/api/v1/push", pushRouter);
app.use("/api/v1/users", usersRouter);

app.use(errorHandler);

export default app;
