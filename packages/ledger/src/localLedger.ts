// LocalLedger - hash-chained ledger implementation using Postgres
// See docs/Architecture.md section 6 for the interface and rules

import { PrismaClient } from '@prisma/client';
import { createHash } from 'node:crypto';
import {
  type LedgerService,
  type LedgerCertificate,
  type LedgerIssuer,
  type LedgerEvent,
  type TxResult,
  LedgerUnavailableError,
} from './index.js';

const prisma = new PrismaClient();

function sha256(data: Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

function canonicalJson(obj: unknown): string {
  const sorted = sortKeys(obj);
  return JSON.stringify(sorted);
}

function sortKeys(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(sortKeys);
  }
  const sortedObj: Record<string, unknown> = {};
  for (const key of Object.keys(obj).sort()) {
    sortedObj[key] = sortKeys((obj as Record<string, unknown>)[key]);
  }
  return sortedObj;
}

function genesisPrevHash(): string {
  return '0'.repeat(64);
}

async function getLastEntry(): Promise<{ seq: number; entryHash: string } | null> {
  const entry = await prisma.ledgerEntry.findFirst({
    orderBy: { seq: 'desc' },
    select: { seq: true, entryHash: true },
  });
  return entry;
}

async function computeEntryHash(
  prevHash: string,
  type: string,
  subjectId: string,
  payload: unknown,
  at: Date
): Promise<string> {
  const entry = {
    type,
    subjectId,
    payload,
    at: at.toISOString(),
  };
  const canonical = canonicalJson(entry);
  const data = prevHash + canonical;
  return sha256(Buffer.from(data, 'utf8'));
}

export class LocalLedger implements LedgerService {
  async registerIssuer(issuerId: string, name: string): Promise<TxResult> {
    const lastEntry = await getLastEntry();
    const prevHash = lastEntry ? lastEntry.entryHash : genesisPrevHash();
    const at = new Date();

    const entryHash = await computeEntryHash(prevHash, 'ISSUER_REGISTERED', issuerId, { name }, at);

    await prisma.$transaction(
      async (tx) => {
        await tx.ledgerEntry.create({
          data: {
            type: 'ISSUER_REGISTERED',
            subjectId: issuerId,
            payload: { name },
            prevHash,
            entryHash,
            at,
          },
        });
      },
      { isolationLevel: 'Serializable' }
    );

    return { txId: entryHash, committedAt: at.toISOString() };
  }

  async setIssuerStatus(issuerId: string, status: 'ACTIVE' | 'DISABLED'): Promise<TxResult> {
    const lastEntry = await getLastEntry();
    if (!lastEntry) {
      throw new LedgerUnavailableError('No genesis entry found');
    }
    const prevHash = lastEntry.entryHash;
    const at = new Date();

    const entryHash = await computeEntryHash(
      prevHash,
      'ISSUER_STATUS_UPDATED',
      issuerId,
      { status },
      at
    );

    await prisma.$transaction(
      async (tx) => {
        await tx.ledgerEntry.create({
          data: {
            type: 'ISSUER_STATUS_UPDATED',
            subjectId: issuerId,
            payload: { status },
            prevHash,
            entryHash,
            at,
          },
        });
      },
      { isolationLevel: 'Serializable' }
    );

    return { txId: entryHash, committedAt: at.toISOString() };
  }

  async registerIssuerKey(
    issuerId: string,
    keyId: string,
    publicKeyPem: string
  ): Promise<TxResult> {
    const lastEntry = await getLastEntry();
    if (!lastEntry) {
      throw new LedgerUnavailableError('No genesis entry found');
    }
    const prevHash = lastEntry.entryHash;
    const at = new Date();

    const entryHash = await computeEntryHash(
      prevHash,
      'KEY_REGISTERED',
      keyId,
      { issuerId, publicKeyPem },
      at
    );

    await prisma.$transaction(
      async (tx) => {
        await tx.ledgerEntry.create({
          data: {
            type: 'KEY_REGISTERED',
            subjectId: keyId,
            payload: { issuerId, publicKeyPem },
            prevHash,
            entryHash,
            at,
          },
        });
      },
      { isolationLevel: 'Serializable' }
    );

    return { txId: entryHash, committedAt: at.toISOString() };
  }

  async setKeyStatus(
    keyId: string,
    status: 'ACTIVE' | 'RETIRED' | 'COMPROMISED'
  ): Promise<TxResult> {
    const lastEntry = await getLastEntry();
    if (!lastEntry) {
      throw new LedgerUnavailableError('No genesis entry found');
    }
    const prevHash = lastEntry.entryHash;
    const at = new Date();

    const entryHash = await computeEntryHash(prevHash, 'KEY_STATUS_UPDATED', keyId, { status }, at);

    await prisma.$transaction(
      async (tx) => {
        await tx.ledgerEntry.create({
          data: {
            type: 'KEY_STATUS_UPDATED',
            subjectId: keyId,
            payload: { status },
            prevHash,
            entryHash,
            at,
          },
        });
      },
      { isolationLevel: 'Serializable' }
    );

    return { txId: entryHash, committedAt: at.toISOString() };
  }

  async issueCertificate(cert: LedgerCertificate): Promise<TxResult> {
    const lastEntry = await getLastEntry();
    if (!lastEntry) {
      throw new LedgerUnavailableError('No genesis entry found');
    }

    const existing = await this.getCertificate(cert.certificateId);
    if (existing) {
      throw new Error('Duplicate certificate ID');
    }

    const issuer = await this.getIssuer(cert.issuerId);
    if (!issuer || issuer.status === 'DISABLED') {
      throw new Error('Unknown or disabled issuer');
    }

    const prevHash = lastEntry.entryHash;
    const at = new Date();

    const entryHash = await computeEntryHash(
      prevHash,
      'ISSUED',
      cert.certificateId,
      {
        issuerId: cert.issuerId,
        documentHash: cert.documentHash,
        signature: cert.signature,
        keyId: cert.keyId,
        issuedAt: cert.issuedAt,
        expiresAt: cert.expiresAt,
        status: cert.status,
      },
      at
    );

    await prisma.$transaction(
      async (tx) => {
        await tx.ledgerEntry.create({
          data: {
            type: 'ISSUED',
            subjectId: cert.certificateId,
            payload: {
              issuerId: cert.issuerId,
              documentHash: cert.documentHash,
              signature: cert.signature,
              keyId: cert.keyId,
              issuedAt: cert.issuedAt,
              expiresAt: cert.expiresAt,
              status: cert.status,
            },
            prevHash,
            entryHash,
            at,
          },
        });
      },
      { isolationLevel: 'Serializable' }
    );

    return { txId: entryHash, committedAt: at.toISOString() };
  }

  async revokeCertificate(
    certificateId: string,
    reasonCode: string,
    actorId: string
  ): Promise<TxResult> {
    const lastEntry = await getLastEntry();
    if (!lastEntry) {
      throw new LedgerUnavailableError('No genesis entry found');
    }

    const existing = await this.getCertificate(certificateId);
    if (!existing) {
      throw new Error('Unknown certificate');
    }
    if (existing.status === 'REVOKED') {
      throw new Error('Certificate already revoked');
    }

    const prevHash = lastEntry.entryHash;
    const at = new Date();

    const entryHash = await computeEntryHash(
      prevHash,
      'REVOKED',
      certificateId,
      { reasonCode, actorId },
      at
    );

    await prisma.$transaction(
      async (tx) => {
        await tx.ledgerEntry.create({
          data: {
            type: 'REVOKED',
            subjectId: certificateId,
            payload: { reasonCode, actorId },
            prevHash,
            entryHash,
            at,
          },
        });
      },
      { isolationLevel: 'Serializable' }
    );

    return { txId: entryHash, committedAt: at.toISOString() };
  }

  async getCertificate(certificateId: string): Promise<LedgerCertificate | null> {
    const issuedEntry = await prisma.ledgerEntry.findFirst({
      where: { type: 'ISSUED', subjectId: certificateId },
      orderBy: { seq: 'desc' },
    });

    if (!issuedEntry) {
      return null;
    }

    const revokedEntry = await prisma.ledgerEntry.findFirst({
      where: { type: 'REVOKED', subjectId: certificateId },
      orderBy: { seq: 'desc' },
    });

    const payload = issuedEntry.payload as Record<string, unknown>;

    return {
      certificateId,
      issuerId: payload.issuerId as string,
      documentHash: payload.documentHash as string,
      signature: payload.signature as string,
      keyId: payload.keyId as string,
      issuedAt: payload.issuedAt as string,
      expiresAt: payload.expiresAt as string | null,
      status: revokedEntry ? 'REVOKED' : (payload.status as 'ISSUED' | 'REVOKED'),
    };
  }

  async getIssuer(issuerId: string): Promise<LedgerIssuer | null> {
    const entry = await prisma.ledgerEntry.findFirst({
      where: { type: 'ISSUER_REGISTERED', subjectId: issuerId },
      orderBy: { seq: 'desc' },
    });

    if (!entry) {
      return null;
    }

    const statusEntry = await prisma.ledgerEntry.findFirst({
      where: { type: 'ISSUER_STATUS_UPDATED', subjectId: issuerId },
      orderBy: { seq: 'desc' },
    });

    const payload = entry.payload as Record<string, unknown>;
    const status = (statusEntry?.payload as Record<string, unknown>)?.status as
      'ACTIVE' | 'DISABLED' | undefined;

    return {
      issuerId,
      name: payload.name as string,
      status: status ?? 'ACTIVE',
    };
  }

  async getHistory(certificateId: string): Promise<LedgerEvent[]> {
    const entries = await prisma.ledgerEntry.findMany({
      where: {
        OR: [
          { subjectId: certificateId },
          {
            AND: [
              { type: 'ISSUED' },
              { payload: { path: ['certificateId'], equals: certificateId } },
            ],
          },
        ],
      },
      orderBy: { seq: 'asc' },
    });

    return entries.map((e) => ({
      type: e.type,
      subjectId: e.subjectId,
      payload: e.payload,
      at: e.at.toISOString(),
      txId: e.entryHash,
    }));
  }

  async verifyChain(): Promise<{ valid: boolean; firstBrokenIndex?: number }> {
    const entries = await prisma.ledgerEntry.findMany({
      orderBy: { seq: 'asc' },
    });

    let expectedPrevHash = genesisPrevHash();

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]!;
      const entryData = {
        type: entry.type,
        subjectId: entry.subjectId,
        payload: entry.payload,
        at: entry.at.toISOString(),
      };
      const canonical = canonicalJson(entryData);
      const computedHash = sha256(Buffer.from(expectedPrevHash + canonical, 'utf8'));

      if (computedHash !== entry.entryHash) {
        return { valid: false, firstBrokenIndex: i };
      }

      if (entry.prevHash !== expectedPrevHash) {
        return { valid: false, firstBrokenIndex: i };
      }

      expectedPrevHash = entry.entryHash;
    }

    return { valid: true };
  }
}
