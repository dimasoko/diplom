import type { Request, Response } from 'express'
import { z } from 'zod'
import {
  clearRefreshCookieOptions,
  getRefreshCookieName,
  getRefreshCookieOptions,
  login,
  logout,
  parseCookies,
  refresh,
  register,
} from '../services/authService.js'

const registerSchema = z.object({
  email: z.email(),
  phone: z.string().trim().min(10).max(32),
  password: z.string().min(8).max(100),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
})

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(100),
})

const emptyBodySchema = z.object({}).passthrough()

function getRefreshTokenFromRequest(req: Request) {
  const cookies = parseCookies(req.headers.cookie)
  return cookies[getRefreshCookieName()]
}

function handleAuthError(res: Response, error: unknown) {
  if (error instanceof z.ZodError) {
    return res.status(400).json({
      message: 'Validation error',
      errors: error.flatten(),
    })
  }

  if (error instanceof Error) {
    const message = error.message
    const status =
      message === 'User already exists'
        ? 409
        : message === 'Invalid credentials' || message === 'Invalid refresh token'
          ? 401
          : 500

    return res.status(status).json({
      message,
    })
  }

  return res.status(500).json({
    message: 'Internal server error',
  })
}

export async function registerHandler(req: Request, res: Response) {
  try {
    const payload = registerSchema.parse(req.body)
    const result = await register(payload)

    res.cookie(
      getRefreshCookieName(),
      result.refreshToken,
      getRefreshCookieOptions(),
    )

    return res.status(201).json({
      user: result.user,
      accessToken: result.accessToken,
    })
  } catch (error) {
    return handleAuthError(res, error)
  }
}

export async function loginHandler(req: Request, res: Response) {
  try {
    const payload = loginSchema.parse(req.body)
    const result = await login(payload)

    res.cookie(
      getRefreshCookieName(),
      result.refreshToken,
      getRefreshCookieOptions(),
    )

    return res.status(200).json({
      user: result.user,
      accessToken: result.accessToken,
    })
  } catch (error) {
    return handleAuthError(res, error)
  }
}

export async function refreshHandler(req: Request, res: Response) {
  try {
    emptyBodySchema.parse(req.body ?? {})

    const refreshToken = getRefreshTokenFromRequest(req)

    if (!refreshToken) {
      return res.status(401).json({
        message: 'Invalid refresh token',
      })
    }

    const result = await refresh(refreshToken)

    res.cookie(
      getRefreshCookieName(),
      result.refreshToken,
      getRefreshCookieOptions(),
    )

    return res.status(200).json({
      user: result.user,
      accessToken: result.accessToken,
    })
  } catch (error) {
    return handleAuthError(res, error)
  }
}

export async function logoutHandler(req: Request, res: Response) {
  try {
    emptyBodySchema.parse(req.body ?? {})

    await logout(getRefreshTokenFromRequest(req))

    res.clearCookie(getRefreshCookieName(), clearRefreshCookieOptions())

    return res.status(200).json({
      message: 'Logged out',
    })
  } catch (error) {
    return handleAuthError(res, error)
  }
}
