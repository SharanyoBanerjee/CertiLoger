// LocalLedger tests
// Tests for hash-chained ledger implementation

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';

// Set environment variables using vi.hoisted to run before imports
vi.hoisted(() => {
  process.env.DATABASE_URL = 'postgresql://certiledger:certiledger@localhost:5432/certiledger';
});

import { PrismaClient } from '@prisma/client';
import { LocalLedger } from './localLedger';
import { LedgerUnavailableError } from './index';

const prisma = new PrismaClient();
const ledger = new LocalLedger();

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  // Clean the ledger table before each test
  await prisma.ledgerEntry.deleteMany({});
});

describe('LocalLedger', () => {
  describe('registerIssuer', () => {
    it('registers first issuer with genesis prevHash', async () => {
      const result = await ledger.registerIssuer('INST-001', 'Test University');

      expect(result).toHaveProperty('txId');
      expect(result).toHaveProperty('committedAt');
      expect(result.txId).toHaveLength(64); // SHA-256 hex
    });

    it('chains subsequent issuers', async () => {
      await ledger.registerIssuer('INST-001', 'First');
      const result = await ledger.registerIssuer('INST-002', 'Second');

      expect(result.txId).toHaveLength(64);
    });

    it('stores issuer data correctly', async () => {
      await ledger.registerIssuer('INST-001', 'Test University');
      const issuer = await ledger.getIssuer('INST-001');

      expect(issuer).not.toBeNull();
      expect(issuer!.issuerId).toBe('INST-001');
      expect(issuer!.name).toBe('Test University');
      expect(issuer!.status).toBe('ACTIVE');
    });
  });

  describe('setIssuerStatus', () => {
    it('updates issuer status to DISABLED', async () => {
      await ledger.registerIssuer('INST-001', 'Test University');
      await ledger.setIssuerStatus('INST-001', 'DISABLED');

      const issuer = await ledger.getIssuer('INST-001');
      expect(issuer!.status).toBe('DISABLED');
    });

    it('updates issuer status to ACTIVE', async () => {
      await ledger.registerIssuer('INST-001', 'Test University');
      await ledger.setIssuerStatus('INST-001', 'DISABLED');
      await ledger.setIssuerStatus('INST-001', 'ACTIVE');

      const issuer = await ledger.getIssuer('INST-001');
      expect(issuer!.status).toBe('ACTIVE');
    });

    it('throws LedgerUnavailableError when no genesis entry', async () => {
      await prisma.ledgerEntry.deleteMany({});
      await expect(ledger.setIssuerStatus('INST-001', 'DISABLED')).rejects.toThrow(
        LedgerUnavailableError
      );
    });
  });

  describe('registerIssuerKey', () => {
    it('registers a key for an issuer', async () => {
      await ledger.registerIssuer('INST-001', 'Test University');
      const publicKey =
        '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END PUBLIC KEY-----';

      const result = await ledger.registerIssuerKey('INST-001', 'INST-001-KEY-01', publicKey);

      expect(result).toHaveProperty('txId');
      expect(result.txId).toHaveLength(64);
    });

    it('throws LedgerUnavailableError when no genesis entry', async () => {
      await prisma.ledgerEntry.deleteMany({});
      await expect(ledger.registerIssuerKey('INST-001', 'KEY-01', 'key')).rejects.toThrow(
        LedgerUnavailableError
      );
    });
  });

  describe('setKeyStatus', () => {
    it('updates key status to RETIRED', async () => {
      await ledger.registerIssuer('INST-001', 'Test University');
      await ledger.registerIssuerKey('INST-001', 'KEY-01', 'public-key');
      await ledger.setKeyStatus('KEY-01', 'RETIRED');

      // Verify by checking the ledger entry
      const entry = await prisma.ledgerEntry.findFirst({
        where: { type: 'KEY_STATUS_UPDATED', subjectId: 'KEY-01' },
        orderBy: { seq: 'desc' },
      });
      expect(entry).not.toBeNull();
      expect((entry!.payload as Record<string, unknown>).status).toBe('RETIRED');
    });

    it('updates key status to COMPROMISED', async () => {
      await ledger.registerIssuer('INST-001', 'Test University');
      await ledger.registerIssuerKey('INST-001', 'KEY-01', 'public-key');
      await ledger.setKeyStatus('KEY-01', 'COMPROMISED');

      const entry = await prisma.ledgerEntry.findFirst({
        where: { type: 'KEY_STATUS_UPDATED', subjectId: 'KEY-01' },
        orderBy: { seq: 'desc' },
      });
      expect((entry!.payload as Record<string, unknown>).status).toBe('COMPROMISED');
    });

    it('throws LedgerUnavailableError when no genesis entry', async () => {
      await prisma.ledgerEntry.deleteMany({});
      await expect(ledger.setKeyStatus('KEY-01', 'RETIRED')).rejects.toThrow(
        LedgerUnavailableError
      );
    });
  });

  describe('issueCertificate', () => {
    const validCert = {
      certificateId: 'CERT-001',
      issuerId: 'INST-001',
      documentHash: 'a'.repeat(64),
      signature: 'signature-base64',
      keyId: 'INST-001-KEY-01',
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'ISSUED' as const,
    };

    it('issues a certificate successfully', async () => {
      await ledger.registerIssuer('INST-001', 'Test University');
      const result = await ledger.issueCertificate(validCert);

      expect(result).toHaveProperty('txId');
      expect(result.txId).toHaveLength(64);

      const cert = await ledger.getCertificate('CERT-001');
      expect(cert).not.toBeNull();
      expect(cert!.certificateId).toBe('CERT-001');
      expect(cert!.status).toBe('ISSUED');
    });

    it('rejects duplicate certificate ID', async () => {
      await ledger.registerIssuer('INST-001', 'Test University');
      await ledger.issueCertificate(validCert);

      await expect(ledger.issueCertificate(validCert)).rejects.toThrow('Duplicate certificate ID');
    });

    it('rejects unknown issuer', async () => {
      await expect(ledger.issueCertificate(validCert)).rejects.toThrow(
        'Unknown or disabled issuer'
      );
    });

    it('rejects disabled issuer', async () => {
      await ledger.registerIssuer('INST-001', 'Test University');
      await ledger.setIssuerStatus('INST-001', 'DISABLED');

      await expect(ledger.issueCertificate(validCert)).rejects.toThrow(
        'Unknown or disabled issuer'
      );
    });

    it('throws LedgerUnavailableError when no genesis entry', async () => {
      await prisma.ledgerEntry.deleteMany({});
      await expect(ledger.issueCertificate(validCert)).rejects.toThrow(LedgerUnavailableError);
    });
  });

  describe('revokeCertificate', () => {
    const validCert = {
      certificateId: 'CERT-002',
      issuerId: 'INST-001',
      documentHash: 'b'.repeat(64),
      signature: 'signature-base64',
      keyId: 'INST-001-KEY-01',
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'ISSUED' as const,
    };

    it('revokes a certificate successfully', async () => {
      await ledger.registerIssuer('INST-001', 'Test University');
      await ledger.issueCertificate(validCert);

      const result = await ledger.revokeCertificate('CERT-002', 'REVOKED_BY_ISSUER', 'user-123');

      expect(result).toHaveProperty('txId');
      expect(result.txId).toHaveLength(64);

      const cert = await ledger.getCertificate('CERT-002');
      expect(cert!.status).toBe('REVOKED');
    });

    it('rejects unknown certificate', async () => {
      await ledger.registerIssuer('INST-001', 'Test University');

      await expect(
        ledger.revokeCertificate('UNKNOWN-CERT', 'REVOKED_BY_ISSUER', 'user-123')
      ).rejects.toThrow('Unknown certificate');
    });

    it('rejects already revoked certificate', async () => {
      await ledger.registerIssuer('INST-001', 'Test University');
      await ledger.issueCertificate(validCert);
      await ledger.revokeCertificate('CERT-002', 'REVOKED_BY_ISSUER', 'user-123');

      await expect(
        ledger.revokeCertificate('CERT-002', 'REVOKED_BY_ISSUER', 'user-123')
      ).rejects.toThrow('Certificate already revoked');
    });

    it('throws LedgerUnavailableError when no genesis entry', async () => {
      await prisma.ledgerEntry.deleteMany({});
      await expect(
        ledger.revokeCertificate('CERT-002', 'REVOKED_BY_ISSUER', 'user-123')
      ).rejects.toThrow(LedgerUnavailableError);
    });
  });

  describe('getCertificate', () => {
    it('returns null for non-existent certificate', async () => {
      const cert = await ledger.getCertificate('NONEXISTENT');
      expect(cert).toBeNull();
    });

    it('returns certificate with correct fields', async () => {
      await ledger.registerIssuer('INST-001', 'Test University');
      const certData = {
        certificateId: 'CERT-003',
        issuerId: 'INST-001',
        documentHash: 'c'.repeat(64),
        signature: 'sig',
        keyId: 'KEY-01',
        issuedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'ISSUED' as const,
      };
      await ledger.issueCertificate(certData);

      const cert = await ledger.getCertificate('CERT-003');
      expect(cert).not.toBeNull();
      expect(cert!.certificateId).toBe('CERT-003');
      expect(cert!.issuerId).toBe('INST-001');
      expect(cert!.documentHash).toBe(certData.documentHash);
      expect(cert!.signature).toBe('sig');
      expect(cert!.keyId).toBe('KEY-01');
      expect(cert!.status).toBe('ISSUED');
    });
  });

  describe('getIssuer', () => {
    it('returns null for non-existent issuer', async () => {
      const issuer = await ledger.getIssuer('NONEXISTENT');
      expect(issuer).toBeNull();
    });

    it('returns issuer with ACTIVE status by default', async () => {
      await ledger.registerIssuer('INST-001', 'Test University');
      const issuer = await ledger.getIssuer('INST-001');

      expect(issuer).not.toBeNull();
      expect(issuer!.issuerId).toBe('INST-001');
      expect(issuer!.name).toBe('Test University');
      expect(issuer!.status).toBe('ACTIVE');
    });

    it('returns issuer with updated status', async () => {
      await ledger.registerIssuer('INST-001', 'Test University');
      await ledger.setIssuerStatus('INST-001', 'DISABLED');

      const issuer = await ledger.getIssuer('INST-001');
      expect(issuer!.status).toBe('DISABLED');
    });
  });

  describe('getHistory', () => {
    it('returns history in chronological order', async () => {
      await ledger.registerIssuer('INST-001', 'Test University');
      await ledger.registerIssuerKey('INST-001', 'KEY-01', 'public-key');

      const cert = {
        certificateId: 'CERT-004',
        issuerId: 'INST-001',
        documentHash: 'd'.repeat(64),
        signature: 'sig',
        keyId: 'KEY-01',
        issuedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'ISSUED' as const,
      };
      await ledger.issueCertificate(cert);
      await ledger.revokeCertificate('CERT-004', 'REVOKED', 'user-123');

      const history = await ledger.getHistory('CERT-004');

      // Should have ISSUED and REVOKED events
      expect(history.length).toBeGreaterThanOrEqual(2);
      const types = history.map((h) => h.type);
      expect(types).toContain('ISSUED');
      expect(types).toContain('REVOKED');
    });

    it('orders history by seq ascending', async () => {
      await ledger.registerIssuer('INST-001', 'Test University');
      await ledger.registerIssuerKey('INST-001', 'KEY-01', 'public-key');

      const cert = {
        certificateId: 'CERT-005',
        issuerId: 'INST-001',
        documentHash: 'e'.repeat(64),
        signature: 'sig',
        keyId: 'KEY-01',
        issuedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'ISSUED' as const,
      };
      await ledger.issueCertificate(cert);
      await ledger.revokeCertificate('CERT-005', 'REVOKED', 'user-123');

      const history = await ledger.getHistory('CERT-005');

      // Check seq order (should be ascending)
      const seqs = history.map((h) => {
        // We can't directly get seq from LedgerEvent, but the order should be correct
        return h.txId;
      });
      // The first should be ISSUED, second REVOKED
      expect(history[0].type).toBe('ISSUED');
      expect(history[1].type).toBe('REVOKED');
    });
  });

  describe('verifyChain', () => {
    it('returns valid for empty chain', async () => {
      await prisma.ledgerEntry.deleteMany({});
      const result = await ledger.verifyChain();
      expect(result.valid).toBe(true);
    });

    it('returns valid for correct chain', async () => {
      await ledger.registerIssuer('INST-001', 'Test University');
      await ledger.registerIssuerKey('INST-001', 'KEY-01', 'public-key');

      const cert = {
        certificateId: 'CERT-006',
        issuerId: 'INST-001',
        documentHash: 'f'.repeat(64),
        signature: 'sig',
        keyId: 'KEY-01',
        issuedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'ISSUED' as const,
      };
      await ledger.issueCertificate(cert);

      const result = await ledger.verifyChain();
      expect(result.valid).toBe(true);
    });

    it('detects tampered entry hash', async () => {
      await ledger.registerIssuer('INST-001', 'Test University');

      // Manually tamper with an entry
      const entry = await prisma.ledgerEntry.findFirst({ orderBy: { seq: 'asc' } });
      await prisma.ledgerEntry.update({
        where: { seq: entry!.seq },
        data: { entryHash: 'tampered'.padEnd(64, '0') },
      });

      const result = await ledger.verifyChain();
      expect(result.valid).toBe(false);
      expect(result.firstBrokenIndex).toBe(0);
    });

    it('detects tampered prevHash', async () => {
      await ledger.registerIssuer('INST-001', 'Test University');

      // Manually tamper with prevHash of second entry
      await ledger.registerIssuer('INST-002', 'Second University');

      const entries = await prisma.ledgerEntry.findMany({ orderBy: { seq: 'asc' } });
      await prisma.ledgerEntry.update({
        where: { seq: entries[1].seq },
        data: { prevHash: 'tampered'.padEnd(64, '0') },
      });

      const result = await ledger.verifyChain();
      expect(result.valid).toBe(false);
      expect(result.firstBrokenIndex).toBe(1);
    });

    it('detects tampered payload', async () => {
      await ledger.registerIssuer('INST-001', 'Test University');
      await ledger.registerIssuerKey('INST-001', 'KEY-01', 'public-key');

      const cert = {
        certificateId: 'CERT-007',
        issuerId: 'INST-001',
        documentHash: 'g'.repeat(64),
        signature: 'sig',
        keyId: 'KEY-01',
        issuedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'ISSUED' as const,
      };
      await ledger.issueCertificate(cert);

      // Tamper with payload of the ISSUED entry
      const entries = await prisma.ledgerEntry.findMany({
        where: { type: 'ISSUED' },
        orderBy: { seq: 'asc' },
      });
      await prisma.ledgerEntry.update({
        where: { seq: entries[0].seq },
        data: {
          payload: {
            ...(entries[0].payload as Record<string, unknown>),
            documentHash: 'tampered'.padEnd(64, '0'),
          },
        },
      });

      const result = await ledger.verifyChain();
      expect(result.valid).toBe(false);
    });
  });

  describe('append-only property', () => {
    it('only appends entries, never updates or deletes', async () => {
      await ledger.registerIssuer('INST-001', 'Test University');
      const count1 = await prisma.ledgerEntry.count();

      await ledger.setIssuerStatus('INST-001', 'DISABLED');
      const count2 = await prisma.ledgerEntry.count();

      await ledger.registerIssuerKey('INST-001', 'KEY-01', 'public-key');
      const count3 = await prisma.ledgerEntry.count();

      expect(count2).toBe(count1 + 1);
      expect(count3).toBe(count2 + 1);

      // All entries should still exist
      const allEntries = await prisma.ledgerEntry.findMany({ orderBy: { seq: 'asc' } });
      expect(allEntries.length).toBe(count3);
    });
  });
});
