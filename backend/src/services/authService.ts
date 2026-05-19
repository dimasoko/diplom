import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'
import { PrismaClient } from '../generated/prisma/client.js'
import { signAccessToken } from '../middleware/requireAuth.js'

const prisma = new PrismaClient() as any

const REFRESH_COOKIE_NAME = 'refreshToken'
const REFRESH_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 30

type SafeUser = {
  id: string
  email: string
  phone: string
  first_name: string
  last_name: string
  role: string
  bonus_balance: number
  is_active: boolean
}

type AuthTokensResult = {
  accessToken: string
  refreshToken: string
}

type AuthResult = AuthTokensResult & {
  user: SafeUser
}

type RegisterInput = {
  email: string
  phone: string
  password: string
  firstName: string
  lastName: string
}

type LoginInput = {
  email: string
  password: string
}

function getRefreshTokenSecret() {
  const secret = process.env.JWT_SECRET

  if (!secret) {
    throw new Error('JWT_SECRET is not configured')
  }

  return `${secret}:refresh`
}

function hashToken(token: string) {
  return crypto
    .createHmac('sha256', getRefreshTokenSecret())
    .update(token)
    .digest('hex')
}

function createRefreshToken() {
  return crypto.randomBytes(48).toString('hex')
}

function getRefreshTokenExpiresAt() {
  return new Date(Date.now() + REFRESH_TOKEN_TTL_MS)
}

function toSafeUser(user: any): SafeUser {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    first_name: user.first_name,
    last_name: user.last_name,
    role: user.role,
    bonus_balance: user.bonus_balance,
    is_active: user.is_active,
  }
}

async function issueTokens(user: any): Promise<AuthTokensResult> {
  const refreshToken = createRefreshToken()

  await prisma.refreshToken.create({
    data: {
      user_id: user.id,
      token_hash: hashToken(refreshToken),
      expires_at: getRefreshTokenExpiresAt(),
    },
  })

  const accessToken = signAccessToken({
    userId: user.id,
    role: user.role,
  })

  return { accessToken, refreshToken }
}

export function getRefreshCookieName() {
  return REFRESH_COOKIE_NAME
}

export function getRefreshCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production'

  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: isProduction,
    path: '/api/v1/auth',
    expires: getRefreshTokenExpiresAt(),
  }
}

export function clearRefreshCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production'

  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: isProduction,
    path: '/api/v1/auth',
  }
}

export function parseCookies(cookieHeader?: string) {
  if (!cookieHeader) {
    return {}
  }

  return cookieHeader.split(';').reduce<Record<string, string>>((acc, part) => {
    const [rawName, ...rest] = part.trim().split('=')

    if (!rawName) {
      return acc
    }

    acc[rawName] = decodeURIComponent(rest.join('='))
    return acc
  }, {})
}

export async function register(input: RegisterInput): Promise<AuthResult> {
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ email: input.email }, { phone: input.phone }],
      deleted_at: null,
    },
  })

  if (existingUser) {
    throw new Error('User already exists')
  }

  const passwordHash = await bcrypt.hash(input.password, 10)

  const user = await prisma.user.create({
    data: {
      email: input.email,
      phone: input.phone,
      password_hash: passwordHash,
      first_name: input.firstName,
      last_name: input.lastName,
      role: 'CLIENT',
      is_active: true,
    },
  })

  const tokens = await issueTokens(user)

  return {
    user: toSafeUser(user),
    ...tokens,
  }
}

export async function login(input: LoginInput): Promise<AuthResult> {
  const user = await prisma.user.findFirst({
    where: {
      email: input.email,
      deleted_at: null,
    },
  })

  if (!user || !user.is_active) {
    throw new Error('Invalid credentials')
  }

  const isPasswordValid = await bcrypt.compare(input.password, user.password_hash)

  if (!isPasswordValid) {
    throw new Error('Invalid credentials')
  }

  const tokens = await issueTokens(user)

  return {
    user: toSafeUser(user),
    ...tokens,
  }
}

export async function refresh(refreshToken: string): Promise<AuthResult> {
  const tokenHash = hashToken(refreshToken)

  const storedToken = await prisma.refreshToken.findFirst({
    where: {
      token_hash: tokenHash,
      revoked_at: null,
      deleted_at: null,
      expires_at: {
        gt: new Date(),
      },
    },
    include: {
      user: true,
    },
  })

  if (!storedToken?.user || !storedToken.user.is_active) {
    throw new Error('Invalid refresh token')
  }

  await prisma.refreshToken.update({
    where: {
      id: storedToken.id,
    },
    data: {
      revoked_at: new Date(),
    },
  })

  const tokens = await issueTokens(storedToken.user)

  return {
    user: toSafeUser(storedToken.user),
    ...tokens,
  }
}

export async function logout(refreshToken?: string) {
  if (!refreshToken) {
    return
  }

  const tokenHash = hashToken(refreshToken)

  await prisma.refreshToken.updateMany({
    where: {
      token_hash: tokenHash,
      revoked_at: null,
      deleted_at: null,
    },
    data: {
      revoked_at: new Date(),
    },
  })
}
