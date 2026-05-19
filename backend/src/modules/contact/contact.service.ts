import { prisma } from "../../lib/prisma";
import { CreateContactRequestInput } from "./contact.validation";

export const createContactRequest = async (payload: CreateContactRequestInput) => {
  return prisma.contactRequest.create({
    data: {
      name: payload.name,
      phone: payload.phone,
      message: payload.message,
      is_processed: false,
    },
  });
};
