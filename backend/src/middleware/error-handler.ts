import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

import { HttpError } from "../errors/http-error";

type ErrorResponse = {
  success: boolean;
  message: string;
  error?: unknown;
};

const sendError = (
  res: Response,
  statusCode: number,
  message: string,
  error?: unknown,
): Response<ErrorResponse> => {
  return res.status(statusCode).json({
    success: false,
    message,
    error,
  });
};

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): Response<ErrorResponse> => {
  if (err instanceof ZodError) {
    return sendError(res, 400, "Validation error", err.flatten());
  }

  const prismaError =
    typeof err === "object" && err !== null
      ? (err as {
          name?: string;
          code?: string;
          meta?: unknown;
          message?: string;
        })
      : null;

  if (prismaError?.name === "PrismaClientKnownRequestError") {
    return sendError(res, 400, "Database request error", {
      code: prismaError.code,
      meta: prismaError.meta,
      message: prismaError.message,
    });
  }

  if (prismaError?.name === "PrismaClientValidationError") {
    return sendError(res, 400, "Database validation error", {
      message: prismaError.message,
    });
  }

  if (prismaError?.name === "PrismaClientInitializationError") {
    return sendError(res, 500, "Database initialization error", {
      message: prismaError.message,
    });
  }

  if (err instanceof HttpError) {
    return sendError(res, err.statusCode, err.message, err.error);
  }

  const fallbackMessage =
    err instanceof Error ? err.message : "Internal server error";

  return sendError(res, 500, fallbackMessage);
};
