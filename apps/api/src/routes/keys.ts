import { Router } from 'express';
import { z } from 'zod';
import { registerIssuerKey, setKeyStatus, listKeys, getKey } from '../services/institution.js';
import { validate } from '../middleware/validate.js';
import { requireAuth, requireRole, requireInstitutionAccess } from '../middleware/auth.js';
import { writeAuditLog } from '../services/audit.js';

const router = Router();

const registerKeySchema = z.object({
  body: z.object({
    institutionId: z.string().min(1),
    keyId: z.string().min(1).max(64),
    publicKeyPem: z.string().min(1),
  }),
});

const keyStatusSchema = z.object({
  params: z.object({ keyId: z.string().min(1) }),
  body: z.object({ status: z.enum(['ACTIVE', 'RETIRED', 'COMPROMISED']) }),
});

router.post(
  '/register',
  requireAuth,
  requireRole('INSTITUTION_ADMIN'),
  requireInstitutionAccess,
  validate(registerKeySchema),
  async (req, res, next) => {
    try {
      const key = await registerIssuerKey(
        req.body.institutionId,
        req.body.keyId,
        req.body.publicKeyPem
      );
      await writeAuditLog({
        userId: req.user!.sub,
        action: 'KEY_REGISTER',
        meta: { institutionId: key.institutionId, keyId: key.keyId },
      });
      res.status(201).json(key);
    } catch (err) {
      next(err);
    }
  }
);

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const institutionId =
      req.user?.role === 'INSTITUTION_ADMIN' ? req.user.institutionId : undefined;
    const keys = await listKeys(institutionId);
    res.json(keys);
  } catch (err) {
    next(err);
  }
});

router.get('/:keyId', requireAuth, async (req, res, next) => {
  try {
    const keyId = req.params.keyId as string;
    const key = await getKey(keyId);
    if (!key)
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Key not found' } });
    if (req.user?.role === 'INSTITUTION_ADMIN' && req.user.institutionId !== key.institutionId) {
      return res
        .status(403)
        .json({ error: { code: 'FORBIDDEN', message: 'Access denied to this key' } });
    }
    res.json(key);
  } catch (err) {
    next(err);
  }
});

router.patch(
  '/:keyId/status',
  requireAuth,
  requireRole('INSTITUTION_ADMIN'),
  requireInstitutionAccess,
  validate(keyStatusSchema),
  async (req, res, next) => {
    try {
      const keyId = req.params.keyId as string;
      const key = await getKey(keyId);
      if (!key)
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Key not found' } });
      if (req.user!.institutionId !== key.institutionId) {
        return res
          .status(403)
          .json({ error: { code: 'FORBIDDEN', message: 'Access denied to this key' } });
      }
      const updated = await setKeyStatus(keyId, req.body.status);
      await writeAuditLog({
        userId: req.user!.sub,
        action: 'KEY_STATUS_CHANGE',
        meta: { keyId: updated!.keyId, newStatus: updated!.status },
      });
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
