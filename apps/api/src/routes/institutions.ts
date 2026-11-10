import { Router } from 'express';
import { z } from 'zod';
import {
  createInstitution,
  listInstitutions,
  getInstitutionWithKeys,
  setInstitutionStatus,
} from '../services/institution.js';
import { validate } from '../middleware/validate.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { writeAuditLog } from '../services/audit.js';

const router = Router();

const createInstitutionSchema = z.object({
  body: z.object({
    id: z.string().min(1).max(64),
    name: z.string().min(1).max(256),
  }),
});

const statusSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({ status: z.enum(['ACTIVE', 'DISABLED']) }),
});

router.post(
  '/',
  requireAuth,
  requireRole('NETWORK_ADMIN'),
  validate(createInstitutionSchema),
  async (req, res, next) => {
    try {
      const inst = await createInstitution(req.body);
      await writeAuditLog({
        userId: req.user!.sub,
        action: 'INSTITUTION_CREATE',
        meta: { institutionId: inst.id },
      });
      res.status(201).json(inst);
    } catch (err) {
      next(err);
    }
  }
);

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const institutions = await listInstitutions();
    res.json(institutions);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const inst = await getInstitutionWithKeys(id);
    if (!inst)
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Institution not found' } });
    res.json(inst);
  } catch (err) {
    next(err);
  }
});

router.patch(
  '/:id/status',
  requireAuth,
  requireRole('NETWORK_ADMIN'),
  validate(statusSchema),
  async (req, res, next) => {
    try {
      const id = req.params.id as string;
      const inst = await setInstitutionStatus(id, req.body.status);
      await writeAuditLog({
        userId: req.user!.sub,
        action: 'INSTITUTION_STATUS_CHANGE',
        meta: { institutionId: inst.id, newStatus: inst.status },
      });
      res.json(inst);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
