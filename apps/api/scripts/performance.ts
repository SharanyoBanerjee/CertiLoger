// Performance measurement script for CertiLedger
// Measures median and p95 over 20+ runs for:
// - Hashing (SHA-256)
// - Signing (RSA-PSS)
// - Signature verification
// - Ledger lookup
// - Total verify
//
// Usage: npm run test:perf --workspace=apps/api
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
const RUNS = 25;

interface TimingResult {
  operation: string;
  times: number[];
  median: number;
  p95: number;
  mean: number;
  min: number;
  max: number;
}

function percentile(arr: number[], p: number): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil(p / 100 * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function median(arr: number[]): number {
  return percentile(arr, 50);
}

function mean(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

async function setupTestEnvironment() {
  // Ensure keys directory exists
  if (!existsSync(KEYS_DIR)) {
    mkdirSync(KEYS_DIR, { recursive: true });
  }
  
  // Create test institution and key
  await prisma.institution.upsert({
    where: { id: 'PERF-TEST' },
    update: {},
    create: { id: 'PERF-TEST', name: 'Performance Test University', status: 'ACTIVE' },
  });
  
  const { privateKeyPem, publicKeyPem } = generateKeyPair();
  const keyId = 'PERF-TEST-KEY-01';
  writeFileSync(join(KEYS_DIR, `${keyId}.pem`), privateKeyPem);
  
  await ledger.registerIssuer('PERF-TEST', 'Performance Test University');
  await ledger.registerIssuerKey('PERF-TEST', keyId, publicKeyPem);
  await prisma.issuerKey.upsert({
    where: { keyId },
    update: {},
    create: { keyId, institutionId: 'PERF-TEST', publicKeyPem, status: 'ACTIVE', validFrom: new Date() },
  });
  
  return { keyId, privateKeyPem, publicKeyPem };
}

async function generateTestCertificate(keyId: string, privateKeyPem: string) {
  const certificateId = `CERT-PERF-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  
  const pdfBytes = await generateCertificatePDF({
    certificateId,
    institutionName: 'Performance Test University',
    holderName: 'Performance Test Holder',
    qualification: 'Performance Test Qualification',
    grade: 'A',
    issuedAt: new Date(),
  });
  
  const documentHash = sha256(Buffer.from(pdfBytes));
  const signature = sign(Buffer.from(pdfBytes), privateKeyPem);
  
  await ledger.issueCertificate({
    certificateId,
    issuerId: 'PERF-TEST',
    documentHash,
    signature,
    keyId,
    issuedAt: new Date().toISOString(),
    expiresAt: null,
    status: 'ISSUED',
  });
  
  return { certificateId, pdfBytes, documentHash, signature };
}

function timeOperation<T>(fn: () => Promise<T>): Promise<{ result: T; durationMs: number }> {
  return new Promise(async (resolve) => {
    const start = process.hrtime.bigint();
    const result = await fn();
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1_000_000;
    resolve({ result, durationMs });
  });
}

async function measureHashing(pdfBytes: Uint8Array): Promise<TimingResult> {
  console.log('\n--- Measuring SHA-256 Hashing ---');
  const times: number[] = [];
  
  for (let i = 0; i < RUNS; i++) {
    const { durationMs } = await timeOperation(() => {
      const hash = sha256(Buffer.from(pdfBytes));
      return Promise.resolve(hash);
    });
    times.push(durationMs);
    if ((i + 1) % 5 === 0) console.log(`  Run ${i + 1}/${RUNS}: ${durationMs.toFixed(3)} ms`);
  }
  
  return {
    operation: 'SHA-256 Hashing',
    times,
    median: median(times),
    p95: percentile(times, 95),
    mean: mean(times),
    min: Math.min(...times),
    max: Math.max(...times),
  };
}

async function measureSigning(pdfBytes: Uint8Array, privateKeyPem: string): Promise<TimingResult> {
  console.log('\n--- Measuring RSA-PSS Signing ---');
  const times: number[] = [];
  
  for (let i = 0; i < RUNS; i++) {
    const { durationMs } = await timeOperation(() => {
      const sig = sign(Buffer.from(pdfBytes), privateKeyPem);
      return Promise.resolve(sig);
    });
    times.push(durationMs);
    if ((i + 1) % 5 === 0) console.log(`  Run ${i + 1}/${RUNS}: ${durationMs.toFixed(3)} ms`);
  }
  
  return {
    operation: 'RSA-PSS Signing',
    times,
    median: median(times),
    p95: percentile(times, 95),
    mean: mean(times),
    min: Math.min(...times),
    max: Math.max(...times),
  };
}

async function measureVerification(pdfBytes: Uint8Array, signature: string, publicKeyPem: string): Promise<TimingResult> {
  console.log('\n--- Measuring RSA-PSS Verification ---');
  const times: number[] = [];
  
  for (let i = 0; i < RUNS; i++) {
    const { durationMs } = await timeOperation(() => {
      const valid = verify(Buffer.from(pdfBytes), signature, publicKeyPem);
      return Promise.resolve(valid);
    });
    times.push(durationMs);
    if ((i + 1) % 5 === 0) console.log(`  Run ${i + 1}/${RUNS}: ${durationMs.toFixed(3)} ms`);
  }
  
  return {
    operation: 'RSA-PSS Verification',
    times,
    median: median(times),
    p95: percentile(times, 95),
    mean: mean(times),
    min: Math.min(...times),
    max: Math.max(...times),
  };
}

async function measureLedgerLookup(certificateId: string): Promise<TimingResult> {
  console.log('\n--- Measuring Ledger Lookup ---');
  const times: number[] = [];
  
  for (let i = 0; i < RUNS; i++) {
    const { durationMs } = await timeOperation(() => ledger.getCertificate(certificateId));
    times.push(durationMs);
    if ((i + 1) % 5 === 0) console.log(`  Run ${i + 1}/${RUNS}: ${durationMs.toFixed(3)} ms`);
  }
  
  return {
    operation: 'Ledger Lookup',
    times,
    median: median(times),
    p95: percentile(times, 95),
    mean: mean(times),
    min: Math.min(...times),
    max: Math.max(...times),
  };
}

async function measureTotalVerify(certificateId: string, pdfBytes: Uint8Array): Promise<TimingResult> {
  console.log('\n--- Measuring Total Verify (with file) ---');
  const times: number[] = [];
  
  // Replicate the full verifyCertificate logic
  async function fullVerify() {
    // Step 1: ledger.getCertificate
    const ledgerCert = await ledger.getCertificate(certificateId);
    if (!ledgerCert) throw new Error('Not found');
    
    // Step 2: ledger.getIssuer
    const ledgerIssuer = await ledger.getIssuer(ledgerCert.issuerId);
    if (!ledgerIssuer || ledgerIssuer.status === 'DISABLED') throw new Error('Issuer untrusted');
    
    // Step 3: public key from registry
    const key = await prisma.issuerKey.findUnique({ where: { keyId: ledgerCert.keyId } });
    if (!key || key.status === 'COMPROMISED') throw new Error('Key untrusted');
    
    // Step 4: document hash
    const uploadHash = sha256(Buffer.from(pdfBytes));
    if (uploadHash !== ledgerCert.documentHash) throw new Error('Hash mismatch');
    
    // Step 5: signature
    const sigValid = verify(Buffer.from(pdfBytes), ledgerCert.signature, key.publicKeyPem);
    if (!sigValid) throw new Error('Signature invalid');
    
    // Step 6: revocation
    if (ledgerCert.status === 'REVOKED') throw new Error('Revoked');
    
    // Step 7: expiry
    if (ledgerCert.expiresAt && new Date(ledgerCert.expiresAt) < new Date()) throw new Error('Expired');
    
    return 'VALID';
  }
  
  for (let i = 0; i < RUNS; i++) {
    const { durationMs } = await timeOperation(fullVerify);
    times.push(durationMs);
    if ((i + 1) % 5 === 0) console.log(`  Run ${i + 1}/${RUNS}: ${durationMs.toFixed(3)} ms`);
  }
  
  return {
    operation: 'Total Verify (with file)',
    times,
    median: median(times),
    p95: percentile(times, 95),
    mean: mean(times),
    min: Math.min(...times),
    max: Math.max(...times),
  };
}

function formatResult(result: TimingResult): string {
  return `
${result.operation}:
  Runs: ${RUNS}
  Min:    ${result.min.toFixed(3)} ms
  Max:    ${result.max.toFixed(3)} ms
  Mean:   ${result.mean.toFixed(3)} ms
  Median: ${result.median.toFixed(3)} ms
  p95:    ${result.p95.toFixed(3)} ms`;
}

async function getMachineSpecs(): Promise<string> {
  const os = await import('node:os');
  const cpu = os.cpus()[0];
  const totalMem = os.totalmem() / (1024 * 1024 * 1024);
  const freeMem = os.freemem() / (1024 * 1024 * 1024);
  
  return `
Machine Specifications:
- Platform: ${os.platform()} ${os.arch()}
- Node.js: ${process.version}
- CPU: ${cpu.model} (${os.cpus().length} cores @ ${cpu.speed} MHz)
- Total Memory: ${totalMem.toFixed(1)} GB
- Free Memory: ${freeMem.toFixed(1)} GB
- OS: ${os.type()} ${os.release()}
`;
}

async function writePerformanceReport(
  specs: string,
  results: TimingResult[],
  setup: { keyId: string; certificateId: string }
) {
  const report = `# Performance Measurements

**Date:** ${new Date().toISOString()}
**Commit:** $(git rev-parse HEAD 2>/dev/null || 'unknown')
**Test Runs:** ${RUNS} per operation

${specs}

## Test Setup
- Institution: PERF-TEST (Performance Test University)
- Key ID: ${setup.keyId}
- Certificate ID: ${setup.certificateId}
- PDF Size: ~3-5 KB typical certificate

## Results Summary

| Operation | Median (ms) | p95 (ms) | Mean (ms) | Min (ms) | Max (ms) |
|-----------|-------------|----------|-----------|----------|----------|
${results.map(r => `| ${r.operation} | ${r.median.toFixed(3)} | ${r.p95.toFixed(3)} | ${r.mean.toFixed(3)} | ${r.min.toFixed(3)} | ${r.max.toFixed(3)} |`).join('\n')}

## Detailed Results

${results.map(formatResult).join('\n')}

## Analysis

- **SHA-256 Hashing**: Very fast, sub-millisecond for typical certificate PDFs
- **RSA-PSS Signing**: Dominated by private key operation; 2048-bit keys typically 5-15ms
- **RSA-PSS Verification**: Faster than signing; public key operation typically 1-3ms
- **Ledger Lookup**: Single indexed DB query; typically 1-5ms depending on DB load
- **Total Verify**: End-to-end verification includes all above plus DB queries; dominated by crypto operations

## Notes

- Measurements taken on local development machine
- PostgreSQL running locally (no network latency)
- No concurrent load during measurements
- Results will vary in production with network, load, and hardware differences
`;

  writeFileSync('docs/performance.md', report);
  console.log('\n--- Performance report written to docs/performance.md ---');
}

async function runPerformanceTests() {
  console.log('\n========================================');
  console.log('  CertiLedger Performance Measurements');
  console.log(`  ${RUNS} runs per operation`);
  console.log('========================================\n');
  
  try {
    // Setup
    console.log('Setting up test environment...');
    const { keyId, privateKeyPem, publicKeyPem } = await setupTestEnvironment();
    
    // Generate test certificate
    console.log('Generating test certificate...');
    const { certificateId, pdfBytes, signature } = await generateTestCertificate(keyId, privateKeyPem);
    console.log(`  Certificate: ${certificateId}`);
    console.log(`  PDF Size: ${pdfBytes.length} bytes`);
    
    // Warm-up runs
    console.log('\nWarming up...');
    for (let i = 0; i < 3; i++) {
      await sha256(Buffer.from(pdfBytes));
      await sign(Buffer.from(pdfBytes), privateKeyPem);
      await verify(Buffer.from(pdfBytes), signature, publicKeyPem);
      await ledger.getCertificate(certificateId);
    }
    
    // Measure each operation
    const results: TimingResult[] = [];
    
    results.push(await measureHashing(pdfBytes));
    results.push(await measureSigning(pdfBytes, privateKeyPem));
    results.push(await measureVerification(pdfBytes, signature, publicKeyPem));
    results.push(await measureLedgerLookup(certificateId));
    results.push(await measureTotalVerify(certificateId, pdfBytes));
    
    // Get machine specs
    const specs = await getMachineSpecs();
    
    // Write report
    await writePerformanceReport(specs, results, { keyId, certificateId });
    
    // Print summary
    console.log('\n========================================');
    console.log('  PERFORMANCE SUMMARY');
    console.log('========================================');
    results.forEach(r => {
      console.log(`  ${r.operation}: median=${r.median.toFixed(3)}ms, p95=${r.p95.toFixed(3)}ms`);
    });
    console.log('========================================\n');
    
  } catch (error) {
    console.error('\nPerformance test failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runPerformanceTests();