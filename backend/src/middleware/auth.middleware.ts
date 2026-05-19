import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

import { UserRole } from "../generated/prisma/enums";
import { HttpError } from "../errors/http-error";

type AuthJwtPayload = {
  sub: string;
  role: UserRole;
  phone: string;
};

declare module "express-serve-static-core" {
  interface Request {
    user?: {
      id: string;
      role: UserRole;
      phone: string;
    };
  }
}

const getAccessTokenSecret = (): string => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new HttpError(500, "JWT_SECRET is not configured");
  }

  return secret;
};

export const requireAuth = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : undefined;

  if (!token) {
    return next(new HttpError(401, "Unauthorized"));
  }

  try {
    const payload = jwt.verify(token, getAccessTokenSecret()) as AuthJwtPayload;

    req.user = {
      id: payload.sub,
      role: payload.role,
      phone: payload.phone,
    };

    return next();
  } catch {
    return next(new HttpError(401, "Invalid access token"));
  }
};

export const requireRole =
  (roles: UserRole[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new HttpError(401, "Unauthorized"));
    }

    if (!roles.includes(req.user.role)) {
      return next(new HttpError(403, "Forbidden"));
    }

    return next();
  };
