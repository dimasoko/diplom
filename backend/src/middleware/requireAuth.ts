import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'

const ACCESS_TOKEN_EXPIRES_IN = '15m'

export interface AuthUserPayload {
  userId: string
  role: string
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUserPayload
}

function getAccessTokenSecret() {
  const secret = process.env.JWT_SECRET

  if (!secret) {
    throw new Error('JWT_SECRET is not configured')
  }

  return secret
}

export function signAccessToken(payload: AuthUserPayload) {
  return jwt.sign(payload, getAccessTokenSecret(), {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
  })
}

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  const authorization = req.headers.authorization

  if (!authorization?.startsWith('Bearer ')) {
    return res.status(401).json({
      message: 'Unauthorized',
    })
  }

  const token = authorization.slice('Bearer '.length)

  try {
    const decoded = jwt.verify(token, getAccessTokenSecret()) as AuthUserPayload

    req.user = {
      userId: decoded.userId,
      role: decoded.role,
    }

    return next()
  } catch {
    return res.status(401).json({
      message: 'Unauthorized',
    })
  }
}

export function requireStaff(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  if (!req.user) {
    return res.status(401).json({
      message: 'Unauthorized',
    })
  }

  if (req.user.role !== 'EMPLOYEE' && req.user.role !== 'ADMIN') {
    return res.status(403).json({
      message: 'Forbidden',
    })
  }

  return next()
}
