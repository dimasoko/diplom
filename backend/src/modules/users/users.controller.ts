import { NextFunction, Request, Response } from "express";

import { HttpError } from "../../errors/http-error";
import { getMe } from "./users.service";

export const getMeHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      throw new HttpError(401, "Unauthorized");
    }

    const user = await getMe(req.user.id);

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};
