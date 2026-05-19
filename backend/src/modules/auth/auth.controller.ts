import { NextFunction, Request, Response } from "express";
import { z } from "zod";

import { HttpError } from "../../errors/http-error";
import {
  logout,
  login,
  register,
  rotateRefreshToken,
} from "./auth.service";

const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(6).max(32),
  password: z.string().min(6).max(128),
});

const loginSchema = z.object({
  phone: z.string().trim().min(6).max(32),
  password: z.string().min(6).max(128),
});

const REFRESH_COOKIE_NAME = "refresh_token";
const REFRESH_COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000;
const isProduction = process.env.NODE_ENV === "production";

const setRefreshCookie = (res: Response, refreshToken: string): void => {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: REFRESH_COOKIE_MAX_AGE,
    path: "/api/v1/auth",
  });
};

const clearRefreshCookie = (res: Response): void => {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/api/v1/auth",
  });
};

export const registerHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const body = registerSchema.parse(req.body);
    const result = await register(body);

    setRefreshCookie(res, result.refreshToken);

    res.status(201).json({
      success: true,
      data: {
        accessToken: result.accessToken,
        user: result.user,
      },
      message: "User registered successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const loginHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const body = loginSchema.parse(req.body);
    const result = await login(body);

    setRefreshCookie(res, result.refreshToken);

    res.status(200).json({
      success: true,
      data: {
        accessToken: result.accessToken,
        user: result.user,
      },
      message: "Login successful",
    });
  } catch (error) {
    next(error);
  }
};

export const refreshHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME] as
      | string
      | undefined;

    if (!refreshToken) {
      throw new HttpError(401, "Refresh token is missing");
    }

    const result = await rotateRefreshToken(refreshToken);
    setRefreshCookie(res, result.refreshToken);

    res.status(200).json({
      success: true,
      data: {
        accessToken: result.accessToken,
        user: result.user,
      },
      message: "Token refreshed",
    });
  } catch (error) {
    next(error);
  }
};

export const logoutHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME] as
      | string
      | undefined;

    await logout(refreshToken);
    clearRefreshCookie(res);

    res.status(200).json({
      success: true,
      data: null,
      message: "Logout successful",
    });
  } catch (error) {
    next(error);
  }
};
