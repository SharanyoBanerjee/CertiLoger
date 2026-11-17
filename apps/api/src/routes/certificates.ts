import { Router, type Request } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { requireAuth, requireRole, type AuthRequest } from '../middleware/auth.js';
import {
  issueCertificate,
  getCertificate,
  listCertificates,
  downloadCertificatePDF,
} from '../services/certificate.js';
import {
  verifyCertificate,
  revokeCertificate,
  getCertificateHistory,
} from '../services/verification.js';
import { AppError } from '../middleware/errors.js';
import multer from 'multer';

// Extend Express Request for multer file
interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

const router = Router();

// Multer for PDF upload (memory storage, max 10MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new AppError('INVALID_FILE_TYPE', 400, 'Only PDF files are allowed'));
  },
});

const issueCertificateSchema = z.object({
  body: z.object({
    institutionId: z.string().min(1),
    holderName: z.string().min(1).max(256),
    qualification: z.string().min(1).max(256),
    grade: z.string().max(64).optional(),
    expiresAt: z.string().datetime().optional(),
  }),
});

// POST /api/certificates - Issue a certificate
router.post(
  '/',
  requireAuth,
  requireRole('ISSUER'),
  validate(issueCertificateSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const { pdfBytes } = await issueCertificate({
        institutionId: req.body.institutionId,
        holderName: req.body.holderName,
        qualification: req.body.qualification,
        grade: req.body.grade,
        expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : undefined,
        issuerUserId: req.user!.sub,
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

// GET /api/certificates - List certificates (scoped to caller)
router.get('/', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const certs = await listCertificates(req.user!.sub, req.user!.role, req.user!.institutionId);
    res.json(certs);
  } catch (err) {
    next(err);
  }
});

// GET /api/certificates/:id - Get certificate metadata
router.get('/:id', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const certificateId = req.params.id;
    if (!certificateId) {
      return res
        .status(400)
        .json({ error: { code: 'VALIDATION_ERROR', message: 'Certificate ID required' } });
    }
    const cert = await getCertificate(certificateId);
    if (!cert) {
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Certificate not found' } });
    }
    // Scope check: ISSUER/HOLDER can only see their institution's certs
    if (
      (req.user!.role === 'ISSUER' || req.user!.role === 'HOLDER') &&
      req.user!.institutionId &&
      cert.institutionId !== req.user!.institutionId
    ) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied' } });
    }
    res.json(cert);
  } catch (err) {
    next(err);
  }
});

// GET /api/certificates/:id/file - Download PDF
router.get('/:id/file', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const certificateId = req.params.id;
    if (!certificateId) {
      return res
        .status(400)
        .json({ error: { code: 'VALIDATION_ERROR', message: 'Certificate ID required' } });
    }
    const cert = await getCertificate(certificateId);
    if (!cert) {
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Certificate not found' } });
    }
    if (cert.status !== 'ISSUED') {
      return res
        .status(409)
        .json({ error: { code: 'INVALID_STATE', message: 'Certificate not issued' } });
    }

    const pdfBytes = await downloadCertificatePDF(certificateId);
    if (!pdfBytes) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'PDF not available' } });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="certificate-${cert.holderName.replace(/\s+/g, '-')}.pdf"`
    );
    res.send(Buffer.from(pdfBytes));
  } catch (err) {
    next(err);
  }
});

// POST /api/certificates/:id/verify - Verify certificate (public, rate-limited, file optional)
router.post('/:id/verify', upload.single('file'), async (req: MulterRequest, res, next) => {
  try {
    const certificateId = req.params.id;
    if (!certificateId) {
      return res
        .status(400)
        .json({ error: { code: 'VALIDATION_ERROR', message: 'Certificate ID required' } });
    }
    const pdfFile = req.file?.buffer;
    const result = await verifyCertificate(certificateId, pdfFile);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/certificates/:id/revoke - Revoke certificate
router.post(
  '/:id/revoke',
  requireAuth,
  requireRole('ISSUER', 'INSTITUTION_ADMIN'),
  validate(
    z.object({
      body: z.object({
        reasonCode: z.string().min(1).max(64),
      }),
    })
  ),
  async (req: AuthRequest, res, next) => {
    try {
      const certificateId = req.params.id;
      if (!certificateId) {
        return res
          .status(400)
          .json({ error: { code: 'VALIDATION_ERROR', message: 'Certificate ID required' } });
      }
      await revokeCertificate(
        certificateId,
        req.body.reasonCode,
        req.user!.sub,
        req.user!.institutionId || '',
        req.user!.role
      );
      res.json({ success: true, message: 'Certificate revoked' });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/certificates/:id/history - Get certificate lifecycle history
router.get('/:id/history', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const certificateId = req.params.id;
    if (!certificateId) {
      return res
        .status(400)
        .json({ error: { code: 'VALIDATION_ERROR', message: 'Certificate ID required' } });
    }
    const cert = await getCertificate(certificateId);
    if (!cert) {
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Certificate not found' } });
    }
    // Scope check
    if (
      (req.user!.role === 'ISSUER' || req.user!.role === 'HOLDER') &&
      req.user!.institutionId &&
      cert.institutionId !== req.user!.institutionId
    ) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied' } });
    }

    const history = await getCertificateHistory(certificateId);
    res.json(history);
  } catch (err) {
    next(err);
  }
});

export default router;
