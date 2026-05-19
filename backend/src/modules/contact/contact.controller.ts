import { NextFunction, Request, Response } from "express";

import { createContactRequest } from "./contact.service";
import { createContactRequestSchema } from "./contact.validation";

export const createContactRequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const payload = createContactRequestSchema.parse(req.body);
    const contactRequest = await createContactRequest(payload);

    res.status(201).json({
      success: true,
      data: contactRequest,
      message: "Contact request created successfully",
    });
  } catch (error) {
    next(error);
  }
};
