// Ledger package - interface and LocalLedger implementation
// See docs/Architecture.md section 6 for the interface definition

export { LocalLedger } from './localLedger.js';

export interface LedgerCertificate {
  certificateId: string;
  issuerId: string;
  documentHash: string;
  signature: string;
  keyId: string;
  issuedAt: string;
  expiresAt: string | null;
  status: 'ISSUED' | 'REVOKED';
}

export interface LedgerIssuer {
  issuerId: string;
  name: string;
  status: 'ACTIVE' | 'DISABLED';
}

export interface LedgerEvent {
  type: string;
  subjectId: string;
  payload: unknown;
  at: string;
  txId: string;
}

export interface TxResult {
  txId: string;
  committedAt: string;
}

export class LedgerUnavailableError extends Error {
  constructor(message = 'Ledger unavailable') {
    super(message);
    this.name = 'LedgerUnavailableError';
  }
}

export interface LedgerService {
  registerIssuer(issuerId: string, name: string): Promise<TxResult>;
  setIssuerStatus(issuerId: string, status: 'ACTIVE' | 'DISABLED'): Promise<TxResult>;
  registerIssuerKey(issuerId: string, keyId: string, publicKeyPem: string): Promise<TxResult>;
  setKeyStatus(keyId: string, status: 'ACTIVE' | 'RETIRED' | 'COMPROMISED'): Promise<TxResult>;
  issueCertificate(cert: LedgerCertificate): Promise<TxResult>;
  revokeCertificate(certificateId: string, reasonCode: string, actorId: string): Promise<TxResult>;
  getCertificate(certificateId: string): Promise<LedgerCertificate | null>;
  getIssuer(issuerId: string): Promise<LedgerIssuer | null>;
  getHistory(certificateId: string): Promise<LedgerEvent[]>;
  verifyChain(): Promise<{ valid: boolean; firstBrokenIndex?: number }>;
}
