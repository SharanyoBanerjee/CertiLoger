import { Router } from 'express';
import { z } from 'zod';
import { login, type JwtPayload } from '../services/auth.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { writeAuditLog } from '../services/audit.js';

const router = Router();

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
});

const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1),
  }),
});

router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await login(email, password);
    await writeAuditLog({ userId: result.user.sub, action: 'LOGIN', meta: { email } });
    res.json({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/refresh', validate(refreshSchema), async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const accessToken = await generateAccessTokenFromRefresh(refreshToken);
    res.json({ accessToken });
  } catch (err) {
    next(err);
  }
});

router.get('/me', requireAuth, async (req, res) => {
  res.json({ user: req.user });
});

async function generateAccessTokenFromRefresh(refreshToken: string): Promise<string> {
  const jwt = await import('jsonwebtoken');
  const { env } = await import('../config/env.js');
  const { prisma } = await import('../config/prisma.js');
  const payload = jwt.default.verify(refreshToken, env.JWT_SECRET) as JwtPayload;
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) throw new Error('User not found');
  return jwt.default.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      institutionId: user.institutionId ?? undefined,
    },
    env.JWT_SECRET,
    { expiresIn: '15m' }
  );
}

export default router;
