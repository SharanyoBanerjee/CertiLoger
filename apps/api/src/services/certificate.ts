// Certificate service - issuance, verification, revocation
// Implements the flows from Architecture.md sections 7-8

import { prisma } from '../config/prisma.js';
import { LocalLedger } from '@certiledger/ledger';
import { createHash, createSign, constants } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NotFoundError, ForbiddenError } from '../middleware/errors.js';
import crypto from 'node:crypto';

const ledger = new LocalLedger();

const PSS_PADDING = {
  padding: constants.RSA_PKCS1_PSS_PADDING,
  saltLength: constants.RSA_PSS_SALTLEN_DIGEST,
};

function sha256(data: Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

function sign(data: Buffer, privateKeyPem: string): string {
  return createSign('sha256')
    .update(data)
    .sign({ key: privateKeyPem, ...PSS_PADDING }, 'base64');
}

function loadPrivateKey(keyId: string): string {
  const keysDir = process.env.KEYS_DIR || './keys';
  const keyPath = join(keysDir, `${keyId}.pem`);
  return readFileSync(keyPath, 'utf8');
}

export interface IssueCertificateInput {
  institutionId: string;
  holderName: string;
  qualification: string;
  grade?: string;
  expiresAt?: Date;
  issuerUserId: string; // for audit log
}

export interface CertificateWithDetails {
  id: string;
  institutionId: string;
  holderName: string;
  qualification: string;
  grade: string | null;
  issuedAt: Date | null;
  expiresAt: Date | null;
  documentHash: string | null;
  keyId: string | null;
  filePath: string | null;
  txId: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  institution: { id: string; name: string; status: string };
}

/**
 * Generate a unique certificate ID (CERT- + 6 random hex chars)
 */
async function generateUniqueCertificateId(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const id = `CERT-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const existing = await prisma.certificate.findUnique({ where: { id } });
    if (!existing) return id;
  }
  throw new Error('Failed to generate unique certificate ID after 10 attempts');
}

/**
 * Get the active signing key for an institution
 */
async function getActiveSigningKey(institutionId: string) {
  const key = await prisma.issuerKey.findFirst({
    where: { institutionId, status: 'ACTIVE' },
    orderBy: { validFrom: 'desc' },
  });
  if (!key) {
    throw new ForbiddenError('No active signing key for institution');
  }
  return key;
}

/**
 * Issue a certificate: generate PDF, hash, sign, write to ledger, store in DB
 */
export async function issueCertificate(
  input: IssueCertificateInput
): Promise<{ certificate: CertificateWithDetails; pdfBytes: Uint8Array }> {
  // 1. Get institution
  const institution = await prisma.institution.findUnique({
    where: { id: input.institutionId },
  });
  if (!institution) {
    throw new NotFoundError('Institution not found');
  }
  if (institution.status !== 'ACTIVE') {
    throw new ForbiddenError('Institution is disabled');
  }

  // 2. Get active signing key
  const key = await getActiveSigningKey(input.institutionId);

  // 3. Generate certificate ID
  const certificateId = await generateUniqueCertificateId();

  // 4. Create Certificate row with PENDING status
  await prisma.certificate.create({
    data: {
      id: certificateId,
      institutionId: input.institutionId,
      holderName: input.holderName,
      qualification: input.qualification,
      grade: input.grade ?? null,
      expiresAt: input.expiresAt ?? null,
      keyId: key.keyId,
      status: 'PENDING',
    },
  });

  try {
    // 5. Generate PDF with certificate ID and QR code
    const pdfBytes = await import('../services/pdf.js').then((m) =>
      m.generateCertificatePDF({
        certificateId,
        institutionName: institution.name,
        holderName: input.holderName,
        qualification: input.qualification,
        grade: input.grade,
        issuedAt: new Date(),
        expiresAt: input.expiresAt,
      })
    );

    // 6. Compute document hash (SHA-256 of PDF bytes)
    const documentHash = sha256(Buffer.from(pdfBytes));

    // 7. Load private key and sign PDF bytes
    const privateKeyPem = loadPrivateKey(key.keyId);
    const signature = sign(Buffer.from(pdfBytes), privateKeyPem);

    // 8. Write to ledger (must commit)
    const issuedAt = new Date().toISOString();
    const expiresAt = input.expiresAt?.toISOString() ?? null;

    await ledger.issueCertificate({
      certificateId,
      issuerId: input.institutionId,
      documentHash,
      signature,
      keyId: key.keyId,
      issuedAt,
      expiresAt,
      status: 'ISSUED',
    });

    // 9. On success: update to ISSUED, store txId, write CertificateEvent + AuditLog
    const updated = await prisma.$transaction(async (tx) => {
      const cert = await tx.certificate.update({
        where: { id: certificateId },
        data: {
          status: 'ISSUED',
          documentHash,
          issuedAt: new Date(),
          txId: certificateId, // using certificateId as txId for now
        },
      });

      await tx.certificateEvent.create({
        data: {
          certificateId,
          type: 'ISSUED',
          actorId: input.issuerUserId,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: input.issuerUserId,
          action: 'CERTIFICATE_ISSUED',
          meta: { certificateId, institutionId: input.institutionId },
        },
      });

      return cert;
    });

    return {
      certificate: {
        ...updated,
        institution: { id: institution.id, name: institution.name, status: institution.status },
      },
      pdfBytes,
    };
  } catch (err) {
    // On failure: mark FAILED, write audit log, re-throw
    await prisma.$transaction(async (tx) => {
      await tx.certificate.update({
        where: { id: certificateId },
        data: { status: 'FAILED' },
      });
      await tx.auditLog.create({
        data: {
          userId: input.issuerUserId,
          action: 'CERTIFICATE_ISSUE_FAILED',
          meta: { certificateId, institutionId: input.institutionId, error: String(err) },
        },
      });
    });
    throw err;
  }
}

/**
 * Get certificate by ID with institution details
 */
export async function getCertificate(id: string): Promise<CertificateWithDetails | null> {
  const cert = await prisma.certificate.findUnique({
    where: { id },
    include: { institution: { select: { id: true, name: true, status: true } } },
  });
  if (!cert) return null;
  return {
    ...cert,
    institution: cert.institution,
  };
}

/**
 * List certificates (scoped to caller's institution for ISSUER, all for admins)
 */
export async function listCertificates(
  userId: string,
  userRole: string,
  institutionId?: string
): Promise<CertificateWithDetails[]> {
  const where = userRole === 'ISSUER' && institutionId ? { institutionId } : {};
  const certs = await prisma.certificate.findMany({
    where,
    include: { institution: { select: { id: true, name: true, status: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return certs.map((c) => ({ ...c, institution: c.institution }));
}

/**
 * Download certificate PDF (regenerate with stored data)
 */
export async function downloadCertificatePDF(certificateId: string): Promise<Uint8Array | null> {
  const cert = await prisma.certificate.findUnique({
    where: { id: certificateId },
    include: { institution: true },
  });
  if (!cert || cert.status !== 'ISSUED' || !cert.issuedAt) return null;

  const pdfBytes = await import('../services/pdf.js').then((m) =>
    m.generateCertificatePDF({
      certificateId: cert.id,
      institutionName: cert.institution.name,
      holderName: cert.holderName,
      qualification: cert.qualification,
      grade: cert.grade ?? undefined,
      issuedAt: cert.issuedAt!,
      expiresAt: cert.expiresAt ?? undefined,
    })
  );
  return pdfBytes;
}
