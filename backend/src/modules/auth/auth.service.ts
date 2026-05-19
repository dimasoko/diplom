import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";

import { HttpError } from "../../errors/http-error";
import { prisma } from "../../lib/prisma";
import { UserRole } from "../../generated/prisma/enums";

type RegisterInput = {
  name: string;
  phone: string;
  password: string;
};

type LoginInput = {
  phone: string;
  password: string;
};

type UserResponse = {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  bonus_balance: number;
  created_at: Date;
};

type AuthResult = {
  accessToken: string;
  refreshToken: string;
  user: UserResponse;
};

const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL_DAYS = 30;
const SALT_ROUNDS = 10;

const getAccessTokenSecret = (): string => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new HttpError(500, "JWT_SECRET is not configured");
  }

  return secret;
};

const getRefreshTokenSecret = (): string => {
  return process.env.JWT_REFRESH_SECRET || getAccessTokenSecret();
};

const getRefreshExpiresAt = (): Date => {
  return new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
};

const buildUserResponse = (user: {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  bonus_balance: number;
  created_at: Date;
}): UserResponse => ({
  id: user.id,
  name: user.name,
  phone: user.phone,
  role: user.role,
  bonus_balance: user.bonus_balance,
  created_at: user.created_at,
});

const createAccessToken = (payload: {
  id: string;
  phone: string;
  role: UserRole;
}): string => {
  return jwt.sign(
    {
      phone: payload.phone,
      role: payload.role,
    },
    getAccessTokenSecret(),
    {
      subject: payload.id,
      expiresIn: ACCESS_TOKEN_TTL,
    },
  );
};

const createRefreshToken = (payload: { id: string }): string => {
  return jwt.sign({}, getRefreshTokenSecret(), {
    subject: payload.id,
    jwtid: randomUUID(),
    expiresIn: `${REFRESH_TOKEN_TTL_DAYS}d`,
  });
};

const createSession = async (user: {
  id: string;
  phone: string;
  role: UserRole;
}): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date }> => {
  const accessToken = createAccessToken(user);
  const refreshToken = createRefreshToken(user);
  const token_hash = await bcrypt.hash(refreshToken, SALT_ROUNDS);
  const expiresAt = getRefreshExpiresAt();

  await prisma.refreshToken.create({
    data: {
      user_id: user.id,
      token_hash,
      expires_at: expiresAt,
    },
  });

  return { accessToken, refreshToken, expiresAt };
};

export const register = async (input: RegisterInput): Promise<AuthResult> => {
  const existingUser = await prisma.user.findFirst({
    where: {
      phone: input.phone,
      deleted_at: null,
    },
  });

  if (existingUser) {
    throw new HttpError(409, "User with this phone already exists");
  }

  const password_hash = await bcrypt.hash(input.password, SALT_ROUNDS);
  const refreshExpiresAt = getRefreshExpiresAt();

  const created = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: input.name,
        phone: input.phone,
        password_hash,
        role: UserRole.CLIENT,
      },
    });

    const actualRefreshToken = createRefreshToken({ id: user.id });
    const actualRefreshTokenHash = await bcrypt.hash(
      actualRefreshToken,
      SALT_ROUNDS,
    );

    await tx.refreshToken.create({
      data: {
        user_id: user.id,
        token_hash: actualRefreshTokenHash,
        expires_at: refreshExpiresAt,
      },
    });

    return {
      user,
      refreshToken: actualRefreshToken,
    };
  });

  const accessToken = createAccessToken({
    id: created.user.id,
    phone: created.user.phone,
    role: created.user.role,
  });

  return {
    accessToken,
    refreshToken: created.refreshToken,
    user: buildUserResponse(created.user),
  };
};

export const login = async (input: LoginInput): Promise<AuthResult> => {
  const user = await prisma.user.findFirst({
    where: {
      phone: input.phone,
      deleted_at: null,
    },
  });

  if (!user) {
    throw new HttpError(401, "Invalid credentials");
  }

  const isPasswordValid = await bcrypt.compare(input.password, user.password_hash);

  if (!isPasswordValid) {
    throw new HttpError(401, "Invalid credentials");
  }

  const session = await createSession({
    id: user.id,
    phone: user.phone,
    role: user.role,
  });

  return {
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    user: buildUserResponse(user),
  };
};

const findActiveTokenRecord = async (
  userId: string,
  refreshToken: string,
): Promise<{ id: string }> => {
  const activeTokens = await prisma.refreshToken.findMany({
    where: {
      user_id: userId,
      revoked_at: null,
      expires_at: {
        gt: new Date(),
      },
    },
    select: {
      id: true,
      token_hash: true,
    },
  });

  for (const tokenRecord of activeTokens) {
    const isMatch = await bcrypt.compare(refreshToken, tokenRecord.token_hash);

    if (isMatch) {
      return { id: tokenRecord.id };
    }
  }

  throw new HttpError(401, "Invalid refresh token");
};

export const rotateRefreshToken = async (
  refreshToken: string,
): Promise<AuthResult> => {
  let payload: jwt.JwtPayload;

  try {
    payload = jwt.verify(refreshToken, getRefreshTokenSecret()) as jwt.JwtPayload;
  } catch {
    throw new HttpError(401, "Invalid refresh token");
  }

  if (!payload.sub || typeof payload.sub !== "string") {
    throw new HttpError(401, "Invalid refresh token payload");
  }

  const user = await prisma.user.findFirst({
    where: {
      id: payload.sub,
      deleted_at: null,
    },
  });

  if (!user) {
    throw new HttpError(401, "User not found");
  }

  const activeTokenRecord = await findActiveTokenRecord(user.id, refreshToken);
  const nextRefreshToken = createRefreshToken({ id: user.id });
  const nextRefreshTokenHash = await bcrypt.hash(nextRefreshToken, SALT_ROUNDS);
  const nextRefreshExpiresAt = getRefreshExpiresAt();

  await prisma.$transaction(async (tx) => {
    await tx.refreshToken.update({
      where: {
        id: activeTokenRecord.id,
      },
      data: {
        revoked_at: new Date(),
      },
    });

    await tx.refreshToken.create({
      data: {
        user_id: user.id,
        token_hash: nextRefreshTokenHash,
        expires_at: nextRefreshExpiresAt,
      },
    });
  });

  const accessToken = createAccessToken({
    id: user.id,
    phone: user.phone,
    role: user.role,
  });

  return {
    accessToken,
    refreshToken: nextRefreshToken,
    user: buildUserResponse(user),
  };
};

const findTokenRecordOrNull = async (
  userId: string,
  refreshToken: string,
): Promise<{ id: string } | null> => {
  const activeTokens = await prisma.refreshToken.findMany({
    where: {
      user_id: userId,
      revoked_at: null,
      expires_at: {
        gt: new Date(),
      },
    },
    select: {
      id: true,
      token_hash: true,
    },
  });

  for (const tokenRecord of activeTokens) {
    const isMatch = await bcrypt.compare(refreshToken, tokenRecord.token_hash);

    if (isMatch) {
      return { id: tokenRecord.id };
    }
  }

  return null;
};

export const logout = async (refreshToken?: string): Promise<void> => {
  if (!refreshToken) {
    return;
  }

  let payload: jwt.JwtPayload;

  try {
    payload = jwt.verify(refreshToken, getRefreshTokenSecret()) as jwt.JwtPayload;
  } catch {
    return;
  }

  if (!payload.sub || typeof payload.sub !== "string") {
    return;
  }

  const tokenRecord = await findTokenRecordOrNull(payload.sub, refreshToken);

  if (!tokenRecord) {
    return;
  }

  await prisma.refreshToken.update({
    where: {
      id: tokenRecord.id,
    },
    data: {
      revoked_at: new Date(),
    },
  });
};
