import { HttpError } from "../../errors/http-error";
import { prisma } from "../../lib/prisma";

export const getMe = async (userId: string) => {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      deleted_at: null,
    },
    select: {
      id: true,
      name: true,
      phone: true,
      role: true,
      bonus_balance: true,
    },
  });

  if (!user) {
    throw new HttpError(404, "User not found");
  }

  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    role: user.role,
    bonus_balance: user.bonus_balance,
    email: null,
  };
};
