import { NextFunction, Request, Response } from "express";

import { HttpError } from "../../errors/http-error";
import {
  getPushHistory,
  getPushPublicKey,
  sendCampaignPush,
  subscribePush,
} from "./push.service";
import {
  pushCampaignSchema,
  pushHistoryQuerySchema,
  subscribePushSchema,
} from "./push.validation";

export const subscribePushHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      throw new HttpError(401, "Unauthorized");
    }

    const payload = subscribePushSchema.parse(req.body);
    const subscription = await subscribePush({
      userId: req.user.id,
      payload,
    });

    res.status(200).json({
      success: true,
      data: subscription,
      message: "Push subscription saved",
    });
  } catch (error) {
    next(error);
  }
};

export const getPushPublicKeyHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const publicKey = getPushPublicKey();
    res.status(200).json({
      success: true,
      data: { publicKey },
    });
  } catch (error) {
    next(error);
  }
};

export const sendCampaignPushHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      throw new HttpError(401, "Unauthorized");
    }

    const payload = pushCampaignSchema.parse(req.body);
    const result = await sendCampaignPush({ payload, createdById: req.user.id });

    res.status(200).json({
      success: true,
      data: result,
      message: "Push campaign sent",
    });
  } catch (error) {
    next(error);
  }
};

export const getPushHistoryHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const query = pushHistoryQuerySchema.parse(req.query);
    const result = await getPushHistory(query);

    res.status(200).json({
      success: true,
      data: result.data,
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
};
