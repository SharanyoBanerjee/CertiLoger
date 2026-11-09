import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { UnauthorizedError, NotFoundError } from '../middleware/errors.js';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  institutionId?: string;
}

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '7d';

export function generateAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
}

export function generateRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: REFRESH_TOKEN_TTL });
}

export function verifyToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
  } catch {
    throw new UnauthorizedError('Invalid or expired token');
  }
}

export async function login(
  email: string,
  password: string
): Promise<{ accessToken: string; refreshToken: string; user: JwtPayload }> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new UnauthorizedError('Invalid credentials');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new UnauthorizedError('Invalid credentials');
  }

  const payload: JwtPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    institutionId: user.institutionId ?? undefined,
  };

  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
    user: payload,
  };
}

export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const payload = verifyToken(refreshToken);
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) {
    throw new NotFoundError('User not found');
  }
  const newPayload: JwtPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    institutionId: user.institutionId ?? undefined,
  };
  return generateAccessToken(newPayload);
}
