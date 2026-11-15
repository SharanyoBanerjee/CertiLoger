// Verification service - certificate verification with revocation
// Implements the exact check order from Architecture.md section 8

import { prisma } from '../config/prisma.js';
import { LocalLedger } from '@certiledger/ledger';
import { createHash, createVerify, constants } from 'node:crypto';
import { NotFoundError, ForbiddenError, LedgerUnavailableError } from '../middleware/errors.js';

const ledger = new LocalLedger();

const PSS_PADDING = {
  padding: constants.RSA_PKCS1_PSS_PADDING,
  saltLength: constants.RSA_PSS_SALTLEN_DIGEST,
};

function sha256(data: Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

function verify(data: Buffer, signature: string, publicKeyPem: string): boolean {
  return createVerify('sha256')
    .update(data)
    .verify({ key: publicKeyPem, ...PSS_PADDING }, signature, 'base64');
}

export type VerificationCheck =
  | 'LEDGER_LOOKUP'
  | 'ISSUER_STATUS'
  | 'KEY_STATUS'
  | 'DOCUMENT_HASH'
  | 'SIGNATURE'
  | 'REVOCATION_STATUS'
  | 'EXPIRY';

export type CheckResult = {
  check: VerificationCheck;
  status: 'pass' | 'fail' | 'skipped';
  reason: string;
};

export type VerificationResult = {
  certificateId: string;
  overallState:
    | 'VALID'
    | 'NOT_FOUND'
    | 'ISSUER_UNTRUSTED'
    | 'DOCUMENT_MISMATCH'
    | 'SIGNATURE_INVALID'
    | 'REVOKED'
    | 'EXPIRED'
    | 'UNAVAILABLE'
    | 'FILE_NOT_CHECKED';
  checks: CheckResult[];
  verifiedAt: string;
};

const CHECK_ORDER: VerificationCheck[] = [
  'LEDGER_LOOKUP',
  'ISSUER_STATUS',
  'KEY_STATUS',
  'DOCUMENT_HASH',
  'SIGNATURE',
  'REVOCATION_STATUS',
  'EXPIRY',
];

/**
 * Verify a certificate by ID, optionally with uploaded PDF file
 * Returns detailed check results and overall state
 * Check order follows Architecture.md section 8 exactly
 */
export async function verifyCertificate(
  certificateId: string,
  pdfFile?: Buffer
): Promise<VerificationResult> {
  const checks: CheckResult[] = [];
  let ledgerCert: Awaited<ReturnType<typeof ledger.getCertificate>> = null;
  let ledgerIssuer: Awaited<ReturnType<typeof ledger.getIssuer>> = null;
  let publicKeyPem: string | null = null;

  // Helper to add a check result
  const addCheck = (
    check: VerificationCheck,
    status: 'pass' | 'fail' | 'skipped',
    reason: string
  ) => {
    checks.push({ check, status, reason });
  };

  // Helper to determine overall state from checks
  const determineState = (): VerificationResult['overallState'] => {
    // Find first failing check in order
    for (const checkName of CHECK_ORDER) {
      const check = checks.find((c) => c.check === checkName);
      if (check && check.status === 'fail') {
        switch (checkName) {
          case 'LEDGER_LOOKUP':
            return 'NOT_FOUND';
          case 'ISSUER_STATUS':
            return 'ISSUER_UNTRUSTED';
          case 'KEY_STATUS':
            return 'ISSUER_UNTRUSTED';
          case 'DOCUMENT_HASH':
            return 'DOCUMENT_MISMATCH';
          case 'SIGNATURE':
            return 'SIGNATURE_INVALID';
          case 'REVOCATION_STATUS':
            return 'REVOKED';
          case 'EXPIRY':
            return 'EXPIRED';
        }
      }
    }
    // If we have a file and all checks passed
    if (pdfFile) {
      return 'VALID';
    }
    // If no file provided, we skipped DOCUMENT_HASH and SIGNATURE
    return 'FILE_NOT_CHECKED';
  };

  try {
    // Step 1: ledger.getCertificate(id)
    ledgerCert = await ledger.getCertificate(certificateId);
    if (!ledgerCert) {
      addCheck('LEDGER_LOOKUP', 'fail', 'Certificate not found in ledger');
      return {
        certificateId,
        overallState: 'NOT_FOUND',
        checks,
        verifiedAt: new Date().toISOString(),
      };
    }
    addCheck('LEDGER_LOOKUP', 'pass', 'Certificate found in ledger');

    // Step 2: ledger.getIssuer(record.issuerId)
    ledgerIssuer = await ledger.getIssuer(ledgerCert.issuerId);
    if (!ledgerIssuer) {
      addCheck('ISSUER_STATUS', 'fail', 'Issuer not found in ledger');
      return {
        certificateId,
        overallState: 'ISSUER_UNTRUSTED',
        checks,
        verifiedAt: new Date().toISOString(),
      };
    }
    if (ledgerIssuer.status === 'DISABLED') {
      addCheck('ISSUER_STATUS', 'fail', 'Issuer is disabled');
      return {
        certificateId,
        overallState: 'ISSUER_UNTRUSTED',
        checks,
        verifiedAt: new Date().toISOString(),
      };
    }
    addCheck('ISSUER_STATUS', 'pass', `Issuer ${ledgerIssuer.name} is active`);

    // Step 3: public key for record.keyId
    const key = await prisma.issuerKey.findUnique({ where: { keyId: ledgerCert.keyId } });
    if (!key) {
      addCheck('KEY_STATUS', 'fail', 'Signing key not found in registry');
      return {
        certificateId,
        overallState: 'ISSUER_UNTRUSTED',
        checks,
        verifiedAt: new Date().toISOString(),
      };
    }
    if (key.status === 'COMPROMISED') {
      addCheck('KEY_STATUS', 'fail', 'Signing key is compromised');
      return {
        certificateId,
        overallState: 'ISSUER_UNTRUSTED',
        checks,
        verifiedAt: new Date().toISOString(),
      };
    }
    // RETIRED keys still verify old certificates
    publicKeyPem = key.publicKeyPem;
    addCheck('KEY_STATUS', 'pass', `Key ${key.keyId} is ${key.status}`);

    // Step 4: sha256(upload) === record.documentHash (if file provided)
    if (pdfFile) {
      const uploadHash = sha256(pdfFile);
      if (uploadHash !== ledgerCert.documentHash) {
        addCheck('DOCUMENT_HASH', 'fail', 'Document hash does not match ledger record');
        return {
          certificateId,
          overallState: 'DOCUMENT_MISMATCH',
          checks,
          verifiedAt: new Date().toISOString(),
        };
      }
      addCheck('DOCUMENT_HASH', 'pass', 'Document hash matches ledger record');
    } else {
      addCheck('DOCUMENT_HASH', 'skipped', 'No file uploaded for hash comparison');
    }

    // Step 5: verify(upload, record.signature, publicKey) (if file provided)
    if (pdfFile && publicKeyPem) {
      const sigValid = verify(pdfFile, ledgerCert.signature, publicKeyPem);
      if (!sigValid) {
        addCheck('SIGNATURE', 'fail', 'Signature verification failed');
        return {
          certificateId,
          overallState: 'SIGNATURE_INVALID',
          checks,
          verifiedAt: new Date().toISOString(),
        };
      }
      addCheck('SIGNATURE', 'pass', 'Signature verified with issuer public key');
    } else if (!pdfFile) {
      addCheck('SIGNATURE', 'skipped', 'No file uploaded for signature verification');
    } else {
      addCheck('SIGNATURE', 'fail', 'Public key not available');
      return {
        certificateId,
        overallState: 'SIGNATURE_INVALID',
        checks,
        verifiedAt: new Date().toISOString(),
      };
    }

    // Step 6: record.status === REVOKED
    if (ledgerCert.status === 'REVOKED') {
      addCheck('REVOCATION_STATUS', 'fail', 'Certificate is revoked');
      return {
        certificateId,
        overallState: 'REVOKED',
        checks,
        verifiedAt: new Date().toISOString(),
      };
    }
    addCheck('REVOCATION_STATUS', 'pass', 'Certificate is not revoked');

    // Step 7: expiresAt in the past
    if (ledgerCert.expiresAt) {
      const expiresAt = new Date(ledgerCert.expiresAt);
      if (expiresAt < new Date()) {
        addCheck('EXPIRY', 'fail', 'Certificate has expired');
        return {
          certificateId,
          overallState: 'EXPIRED',
          checks,
          verifiedAt: new Date().toISOString(),
        };
      }
      addCheck('EXPIRY', 'pass', 'Certificate is not expired');
    } else {
      addCheck('EXPIRY', 'pass', 'Certificate has no expiry date');
    }

    // Step 8: otherwise VALID
    const overallState = determineState();
    return { certificateId, overallState, checks, verifiedAt: new Date().toISOString() };
  } catch (err) {
    // Any LedgerUnavailableError at any step → UNAVAILABLE
    if (
      err instanceof LedgerUnavailableError ||
      (err instanceof Error && err.name === 'LedgerUnavailableError')
    ) {
      // Find which check was running and mark it as fail with UNAVAILABLE
      const lastCheck = checks[checks.length - 1]?.check || 'LEDGER_LOOKUP';
      addCheck(lastCheck, 'fail', 'Ledger unavailable');
      return {
        certificateId,
        overallState: 'UNAVAILABLE',
        checks,
        verifiedAt: new Date().toISOString(),
      };
    }
    throw err;
  }
}

/**
 * Verify certificate by ID only (no file upload)
 * Runs steps 1, 2, 3, 6, 7 and reports "file not checked"
 */
export async function verifyCertificateById(certificateId: string): Promise<VerificationResult> {
  return verifyCertificate(certificateId);
}

/**
 * Revoke a certificate
 */
export async function revokeCertificate(
  certificateId: string,
  reasonCode: string,
  actorId: string,
  userInstitutionId: string,
  userRole: string
): Promise<void> {
  // 1. Check certificate exists and belongs to caller's institution (or caller is admin)
  const cert = await prisma.certificate.findUnique({ where: { id: certificateId } });
  if (!cert) {
    throw new NotFoundError('Certificate not found');
  }

  // 2. Authorization: ISSUER/INSTITUTION_ADMIN can only revoke their own institution's certificates
  if (userRole === 'ISSUER' || userRole === 'INSTITUTION_ADMIN') {
    if (cert.institutionId !== userInstitutionId) {
      throw new ForbiddenError('Certificate belongs to different institution');
    }
  }

  // 3. Status must be ISSUED
  if (cert.status !== 'ISSUED') {
    throw new ForbiddenError('Certificate is not in ISSUED state');
  }

  try {
    // 4. Write revocation to ledger (must commit)
    await ledger.revokeCertificate(certificateId, reasonCode, actorId);

    // 5. On success: update DB status, write CertificateEvent + AuditLog
    await prisma.$transaction(async (tx) => {
      await tx.certificate.update({
        where: { id: certificateId },
        data: { status: 'REVOKED' },
      });

      await tx.certificateEvent.create({
        data: {
          certificateId,
          type: 'REVOKED',
          actorId,
          reasonCode,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'CERTIFICATE_REVOKED',
          meta: { certificateId, reasonCode },
        },
      });
    });
  } catch (err) {
    // On failure: status unchanged, return error
    await prisma.auditLog.create({
      data: {
        userId: actorId,
        action: 'CERTIFICATE_REVOKE_FAILED',
        meta: { certificateId, reasonCode, error: String(err) },
      },
    });
    throw err;
  }
}

/**
 * Get certificate history (lifecycle events)
 */
export async function getCertificateHistory(certificateId: string) {
  const ledgerHistory = await ledger.getHistory(certificateId);

  // Also get DB events for additional details
  const dbEvents = await prisma.certificateEvent.findMany({
    where: { certificateId },
    orderBy: { at: 'asc' },
  });

  return {
    ledger: ledgerHistory,
    events: dbEvents,
  };
}
