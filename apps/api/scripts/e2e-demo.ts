// End-to-end demo test for CertiLedger
// Runs the 10-step demo from Phases.md section "Demo script"
//
// Usage: npm run test:e2e --workspace=apps/api
// Requires: PostgreSQL running, database migrated and seeded

import { PrismaClient } from '@prisma/client';
import { LocalLedger } from '@certiledger/ledger';
import { sha256, sign, verify, loadPrivateKey, generateKeyPair } from '@certiledger/crypto';
import { generateCertificatePDF } from '../services/pdf.js';
import crypto from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const prisma = new PrismaClient();
const ledger = new LocalLedger();

const KEYS_DIR = './keys';
const STORAGE_DIR = './storage';

// Ensure directories exist
if (!existsSync(KEYS_DIR)) mkdirSync(KEYS_DIR, { recursive: true });
if (!existsSync(STORAGE_DIR)) mkdirSync(STORAGE_DIR, { recursive: true });

interface DemoState {
  institutionA: { id: string; name: string };
  institutionB: { id: string; name: string };
  keyA: { keyId: string; privateKeyPem: string; publicKeyPem: string };
  certificateId: string;
  pdfBytes: Uint8Array;
  documentHash: string;
  signature: string;
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function setupInstitutions() {
  console.log('\n=== Step 1: Register two fictional universities ===');
  
  // Create institutions
  const instA = await prisma.institution.upsert({
    where: { id: 'UNIV-A' },
    update: {},
    create: { id: 'UNIV-A', name: 'CertiLedger University A', status: 'ACTIVE' },
  });
  const instB = await prisma.institution.upsert({
    where: { id: 'UNIV-B' },
    update: {},
    create: { id: 'UNIV-B', name: 'CertiLedger University B', status: 'ACTIVE' },
  });

  console.log(`  Registered: ${instA.name} (${instA.id})`);
  console.log(`  Registered: ${instB.name} (${instB.id})`);

  return { institutionA: instA, institutionB: instB };
}

async function setupKeys() {
  console.log('\n=== Step 2: Register a public signing key for each ===');
  
  // Generate key pair for University A
  const { privateKeyPem, publicKeyPem } = generateKeyPair();
  const keyId = 'UNIV-A-KEY-01';
  const keyPath = join(KEYS_DIR, `${keyId}.pem`);
  writeFileSync(keyPath, privateKeyPem);

  // Register in ledger
  await ledger.registerIssuerKey('UNIV-A', keyId, publicKeyPem);
  
  // Register in database
  await prisma.issuerKey.upsert({
    where: { keyId },
    update: {},
    create: { keyId, institutionId: 'UNIV-A', publicKeyPem, status: 'ACTIVE', validFrom: new Date() },
  });

  console.log(`  Registered key: ${keyId} for UNIV-A`);
  console.log(`  Private key saved to: ${keyPath}`);

  return { keyId, privateKeyPem, publicKeyPem };
}

async function issueCertificate(state: DemoState) {
  console.log('\n=== Step 3: Log in as University A, issue a certificate ===');
  
  const certificateId = `CERT-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  
  // Create certificate record with PENDING status
  await prisma.certificate.create({
    data: {
      id: certificateId,
      institutionId: 'UNIV-A',
      holderName: 'Alice Smith',
      qualification: 'Bachelor of Computer Science',
      grade: 'First Class Honours',
      issuedAt: new Date(),
      expiresAt: null,
      keyId: state.keyA.keyId,
      status: 'PENDING',
    },
  });

  // Generate PDF
  const pdfBytes = await generateCertificatePDF({
    certificateId,
    institutionName: state.institutionA.name,
    holderName: 'Alice Smith',
    qualification: 'Bachelor of Computer Science',
    grade: 'First Class Honours',
    issuedAt: new Date(),
  });

  // Hash PDF bytes
  const documentHash = sha256(Buffer.from(pdfBytes));

  // Sign PDF bytes with private key
  const signature = sign(Buffer.from(pdfBytes), state.keyA.privateKeyPem);

  // Write to ledger
  await ledger.issueCertificate({
    certificateId,
    issuerId: 'UNIV-A',
    documentHash,
    signature,
    keyId: state.keyA.keyId,
    issuedAt: new Date().toISOString(),
    expiresAt: null,
    status: 'ISSUED',
  });

  // Update certificate to ISSUED
  await prisma.certificate.update({
    where: { id: certificateId },
    data: { status: 'ISSUED', documentHash, keyId: state.keyA.keyId },
  });

  // Create certificate event
  await prisma.certificateEvent.create({
    data: {
      certificateId,
      type: 'ISSUED',
      actorId: 'demo-user',
    },
  });

  console.log(`  Certificate issued: ${certificateId}`);
  console.log(`  Holder: Alice Smith`);
  console.log(`  Qualification: Bachelor of Computer Science`);
  console.log(`  Grade: First Class Honours`);

  return { certificateId, pdfBytes, documentHash, signature };
}

async function showCertificateInfo(state: DemoState) {
  console.log('\n=== Step 4: Show PDF, ID, QR, hash, signature info ===');
  
  const cert = await prisma.certificate.findUnique({ where: { id: state.certificateId } });
  const ledgerCert = await ledger.getCertificate(state.certificateId);
  
  console.log(`  Certificate ID: ${state.certificateId}`);
  console.log(`  PDF size: ${state.pdfBytes.length} bytes`);
  console.log(`  Document Hash (SHA-256): ${state.documentHash}`);
  console.log(`  Signature (base64, first 64 chars): ${state.signature.substring(0, 64)}...`);
  console.log(`  Key ID: ${state.keyA.keyId}`);
  console.log(`  Status in DB: ${cert?.status}`);
  console.log(`  Status in Ledger: ${ledgerCert?.status}`);
  console.log(`  Issuer: ${state.institutionA.name}`);
}

async function showLedgerEntry(state: DemoState) {
  console.log('\n=== Step 5: Show the ledger entry / transaction ===');
  
  const history = await ledger.getHistory(state.certificateId);
  const chain = await ledger.verifyChain();
  
  console.log(`  Ledger chain valid: ${chain.valid}`);
  console.log(`  History entries: ${history.length}`);
  history.forEach((entry, i) => {
    console.log(`  [${i}] Type: ${entry.type}, Subject: ${entry.subjectId}, TxID: ${entry.txId.substring(0, 16)}...`);
  });
}

async function verifyOriginal(state: DemoState): Promise<string> {
  console.log('\n=== Step 6: Verify the original PDF: VALID ===');
  
  const result = await verifyCertificate(state.certificateId, Buffer.from(state.pdfBytes));
  
  console.log(`  Overall State: ${result.overallState}`);
  result.checks.forEach((check) => {
    console.log(`  [${check.check}] ${check.status.toUpperCase()}: ${check.reason}`);
  });
  
  if (result.overallState !== 'VALID') {
    throw new Error(`Expected VALID, got ${result.overallState}`);
  }
  
  return result.overallState;
}

async function verifyTampered(state: DemoState): Promise<string> {
  console.log('\n=== Step 7: Change one character in a copy, verify: DOCUMENT_MISMATCH ===');
  
  // Create tampered copy (change one byte)
  const tamperedBytes = new Uint8Array(state.pdfBytes);
  tamperedBytes[100] = tamperedBytes[100] ^ 0xFF; // Flip bits at position 100
  
  const result = await verifyCertificate(state.certificateId, Buffer.from(tamperedBytes));
  
  console.log(`  Overall State: ${result.overallState}`);
  result.checks.forEach((check) => {
    console.log(`  [${check.check}] ${check.status.toUpperCase()}: ${check.reason}`);
  });
  
  if (result.overallState !== 'DOCUMENT_MISMATCH') {
    throw new Error(`Expected DOCUMENT_MISMATCH, got ${result.overallState}`);
  }
  
  return result.overallState;
}

async function revokeCertificate(state: DemoState) {
  console.log('\n=== Step 8: Revoke the original ===');
  
  await ledger.revokeCertificate(state.certificateId, 'REVOKED_BY_ISSUER', 'demo-user');
  
  await prisma.certificate.update({
    where: { id: state.certificateId },
    data: { status: 'REVOKED' },
  });
  
  await prisma.certificateEvent.create({
    data: {
      certificateId: state.certificateId,
      type: 'REVOKED',
      actorId: 'demo-user',
      reasonCode: 'REVOKED_BY_ISSUER',
    },
  });
  
  console.log(`  Certificate ${state.certificateId} revoked`);
  console.log(`  Reason: REVOKED_BY_ISSUER`);
}

async function verifyRevoked(state: DemoState): Promise<string> {
  console.log('\n=== Step 9: Verify again: REVOKED ===');
  
  const result = await verifyCertificate(state.certificateId, Buffer.from(state.pdfBytes));
  
  console.log(`  Overall State: ${result.overallState}`);
  result.checks.forEach((check) => {
    console.log(`  [${check.check}] ${check.status.toUpperCase()}: ${check.reason}`);
  });
  
  if (result.overallState !== 'REVOKED') {
    throw new Error(`Expected REVOKED, got ${result.overallState}`);
  }
  
  return result.overallState;
}

async function testNumberTheoryLab() {
  console.log('\n=== Step 10: Number Theory Lab - Toy RSA example ===');
  
  // Import number theory functions dynamically
  const nt = await import('@certiledger/number-theory');
  
  // Reproduce p=61, q=53, e=17, d=2753
  const p = 61n;
  const q = 53n;
  const e = 17n;
  
  // Generate toy RSA
  const keyGen = nt.toyRsaGenerate(p, q, e);
  console.log(`  n = ${keyGen.n}`);
  console.log(`  φ = ${keyGen.phi}`);
  console.log(`  e = ${keyGen.e}`);
  console.log(`  d = ${keyGen.d}`);
  
  // Verify d = 2753
  if (keyGen.d !== 2753n) {
    throw new Error(`Expected d=2753, got ${keyGen.d}`);
  }
  
  // Sign m = 65
  const m = 65n;
  const signature = nt.toyRsaSign(m, keyGen.d, keyGen.n);
  console.log(`  65^d mod n = ${signature}`);
  
  if (signature !== 588n) {
    throw new Error(`Expected signature=588, got ${signature}`);
  }
  
  // Verify
  const verified = nt.toyRsaVerify(signature, keyGen.e, keyGen.n);
  console.log(`  588^e mod n = ${verified}`);
  
  if (verified !== m) {
    throw new Error(`Expected verified=65, got ${verified}`);
  }
  
  console.log(`  ✓ Toy RSA example reproduced correctly`);
}

async function verifyCertificate(certificateId: string, pdfFile?: Buffer) {
  // Replicate the verification logic from services/verification.ts
  const checks: any[] = [];
  
  const addCheck = (check: string, status: 'pass' | 'fail' | 'skipped', reason: string) => {
    checks.push({ check, status, reason });
  };
  
  // Step 1: ledger.getCertificate
  const ledgerCert = await ledger.getCertificate(certificateId);
  if (!ledgerCert) {
    addCheck('LEDGER_LOOKUP', 'fail', 'Certificate not found in ledger');
    return { certificateId, overallState: 'NOT_FOUND', checks };
  }
  addCheck('LEDGER_LOOKUP', 'pass', 'Certificate found in ledger');
  
  // Step 2: ledger.getIssuer
  const ledgerIssuer = await ledger.getIssuer(ledgerCert.issuerId);
  if (!ledgerIssuer || ledgerIssuer.status === 'DISABLED') {
    addCheck('ISSUER_STATUS', 'fail', 'Issuer not found or disabled');
    return { certificateId, overallState: 'ISSUER_UNTRUSTED', checks };
  }
  addCheck('ISSUER_STATUS', 'pass', `Issuer ${ledgerIssuer.name} is active`);
  
  // Step 3: public key from registry
  const key = await prisma.issuerKey.findUnique({ where: { keyId: ledgerCert.keyId } });
  if (!key || key.status === 'COMPROMISED') {
    addCheck('KEY_STATUS', 'fail', 'Key not found or compromised');
    return { certificateId, overallState: 'ISSUER_UNTRUSTED', checks };
  }
  addCheck('KEY_STATUS', 'pass', `Key ${key.keyId} is ${key.status}`);
  
  // Step 4: document hash
  if (pdfFile) {
    const uploadHash = sha256(pdfFile);
    if (uploadHash !== ledgerCert.documentHash) {
      addCheck('DOCUMENT_HASH', 'fail', 'Document hash does not match ledger record');
      return { certificateId, overallState: 'DOCUMENT_MISMATCH', checks };
    }
    addCheck('DOCUMENT_HASH', 'pass', 'Document hash matches ledger record');
  } else {
    addCheck('DOCUMENT_HASH', 'skipped', 'No file uploaded for hash comparison');
  }
  
  // Step 5: signature
  if (pdfFile && key) {
    const sigValid = verify(pdfFile, ledgerCert.signature, key.publicKeyPem);
    if (!sigValid) {
      addCheck('SIGNATURE', 'fail', 'Signature verification failed');
      return { certificateId, overallState: 'SIGNATURE_INVALID', checks };
    }
    addCheck('SIGNATURE', 'pass', 'Signature verified with issuer public key');
  } else if (!pdfFile) {
    addCheck('SIGNATURE', 'skipped', 'No file uploaded for signature verification');
  }
  
  // Step 6: revocation status
  if (ledgerCert.status === 'REVOKED') {
    addCheck('REVOCATION_STATUS', 'fail', 'Certificate is revoked');
    return { certificateId, overallState: 'REVOKED', checks };
  }
  addCheck('REVOCATION_STATUS', 'pass', 'Certificate is not revoked');
  
  // Step 7: expiry
  if (ledgerCert.expiresAt && new Date(ledgerCert.expiresAt) < new Date()) {
    addCheck('EXPIRY', 'fail', 'Certificate has expired');
    return { certificateId, overallState: 'EXPIRED', checks };
  }
  addCheck('EXPIRY', 'pass', 'Certificate is not expired');
  
  // Step 8: VALID
  return { certificateId, overallState: 'VALID', checks };
}

async function runDemo() {
  console.log('\n========================================');
  console.log('  CertiLedger End-to-End Demo');
  console.log('  Based on Phases.md Demo Script');
  console.log('========================================\n');
  
  const state: Partial<DemoState> = {};
  
  try {
    // Step 1: Register institutions
    const insts = await setupInstitutions();
    state.institutionA = insts.institutionA;
    state.institutionB = insts.institutionB;
    
    // Step 2: Register keys
    const keys = await setupKeys();
    state.keyA = keys;
    
    // Step 3: Issue certificate
    const cert = await issueCertificate(state as DemoState);
    state.certificateId = cert.certificateId;
    state.pdfBytes = cert.pdfBytes;
    state.documentHash = cert.documentHash;
    state.signature = cert.signature;
    
    // Step 4: Show info
    await showCertificateInfo(state as DemoState);
    
    // Step 5: Show ledger
    await showLedgerEntry(state as DemoState);
    
    // Step 6: Verify original
    await verifyOriginal(state as DemoState);
    
    // Step 7: Verify tampered
    await verifyTampered(state as DemoState);
    
    // Step 8: Revoke
    await revokeCertificate(state as DemoState);
    
    // Step 9: Verify revoked
    await verifyRevoked(state as DemoState);
    
    // Step 10: Number Theory Lab
    await testNumberTheoryLab();
    
    console.log('\n========================================');
    console.log('  ✓ ALL 10 STEPS PASSED');
    console.log('========================================\n');
    
  } catch (error) {
    console.error('\n========================================');
    console.error('  ✗ DEMO FAILED');
    console.error('========================================\n');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runDemo();