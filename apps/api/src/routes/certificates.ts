import { Router } from 'express';
import { z } from 'zod';
import { generateCertificatePDF } from '../services/pdf.js';
import { validate } from '../middleware/validate.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import crypto from 'node:crypto';

const router = Router();

const issueCertificateSchema = z.object({
  body: z.object({
    institutionId: z.string().min(1),
    holderName: z.string().min(1).max(256),
    qualification: z.string().min(1).max(256),
    grade: z.string().max(64).optional(),
    expiresAt: z.string().datetime().optional(),
  }),
});

router.post(
  '/',
  requireAuth,
  requireRole('ISSUER'),
  validate(issueCertificateSchema),
  async (req, res, next) => {
    try {
      const pdfBytes = await generateCertificatePDF({
        certificateId: `CERT-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
        institutionName: 'University of CertiLedger',
        holderName: req.body.holderName,
        qualification: req.body.qualification,
        grade: req.body.grade,
        issuedAt: new Date(),
        expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : undefined,
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="certificate-${req.body.holderName.replace(/\s+/g, '-')}.pdf"`
      );
      res.send(Buffer.from(pdfBytes));
    } catch (err) {
      next(err);
    }
  }
);

export default router;
