import { Router } from 'express';
import { z } from 'zod';
import { generateCertificatePDF } from '../services/pdf.js';
import { validate } from '../middleware/validate.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { writeAuditLog } from '../services/audit.js';
import { prisma } from '../config/prisma.js';
import { getActiveKey } from '../services/institution.js';
import { sha256, sign, loadPrivateKey } from '@certiledger/crypto';
import { LocalLedger } from '@certiledger/ledger';
import { ForbiddenError } from '../middleware/errors.js';
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

const ledger = new LocalLedger();

function toBuffer(data: Uint8Array): Buffer {
  return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
}

router.post(
  '/',
  requireAuth,
  requireRole('ISSUER'),
  validate(issueCertificateSchema),
  async (req, res, next) => {
    try {
      const { institutionId, holderName, qualification, grade, expiresAt } = req.body;

      // Check caller has access to this institution
      if (req.user!.institutionId !== institutionId) {
        throw new ForbiddenError('Access denied to this institution');
      }

      // Get institution's active signing key
      const activeKey = await getActiveKey(institutionId);
      if (!activeKey) {
        throw new ForbiddenError('No active signing key for this institution');
      }

      // Generate certificate ID
      const certificateId = `CERT-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

      // Get institution name
      const institution = await prisma.institution.findUnique({
        where: { id: institutionId },
        select: { name: true },
      });
      if (!institution) {
        throw new ForbiddenError('Institution not found');
      }

      // Create certificate record with PENDING status
      const issuedAt = new Date();
      await prisma.certificate.create({
        data: {
          id: certificateId,
          institutionId,
          holderName,
          qualification,
          grade,
          issuedAt,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          status: 'PENDING',
        },
      });

      try {
        // Render PDF with certificate ID and QR code
        const pdfBytes = await generateCertificatePDF({
          certificateId,
          institutionName: institution.name,
          holderName,
          qualification,
          grade,
          issuedAt,
          expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        });

        // Hash the PDF bytes
        const pdfBuffer = toBuffer(pdfBytes);
        const documentHash = sha256(pdfBuffer);

        // Load private key and sign the PDF bytes
        const privateKeyPem = loadPrivateKey(activeKey.keyId);
        const signature = sign(pdfBuffer, privateKeyPem);

        // Commit to ledger
        const ledgerResult = await ledger.issueCertificate({
          certificateId,
          issuerId: institutionId,
          documentHash,
          signature,
          keyId: activeKey.keyId,
          issuedAt: issuedAt.toISOString(),
          expiresAt: expiresAt ?? null,
          status: 'ISSUED',
        });

        // Update certificate record with ISSUED status and ledger data
        await prisma.certificate.update({
          where: { id: certificateId },
          data: {
            status: 'ISSUED',
            documentHash,
            keyId: activeKey.keyId,
            txId: ledgerResult.txId,
          },
        });

        // Create certificate event
        await prisma.certificateEvent.create({
          data: {
            certificateId,
            type: 'ISSUED',
            actorId: req.user!.sub,
            txId: ledgerResult.txId,
          },
        });

        // Audit log
        await writeAuditLog({
          userId: req.user!.sub,
          action: 'CERTIFICATE_ISSUE',
          meta: { certificateId, institutionId, holderName },
        });

        // Return PDF
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="certificate-${holderName.replace(/\s+/g, '-')}.pdf"`
        );
        res.send(Buffer.from(pdfBytes));
      } catch (err) {
        // Mark certificate as FAILED
        await prisma.certificate.update({
          where: { id: certificateId },
          data: { status: 'FAILED' },
        });
        throw err;
      }
    } catch (err) {
      next(err);
    }
  }
);

export default router;
