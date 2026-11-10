// Crypto package - real SHA-256 and RSA-PSS using node:crypto
// Wraps node:crypto only. Never imports number-theory.

import { createHash, createSign, createVerify, generateKeyPairSync, constants } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const PSS_PADDING = {
  padding: constants.RSA_PKCS1_PSS_PADDING,
  saltLength: constants.RSA_PSS_SALTLEN_DIGEST,
};

/**
 * Compute SHA-256 hash of a Buffer.
 * Returns hex string (64 characters).
 */
export function sha256(data: Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Compute SHA-256 hash of a readable stream.
 * Returns hex string (64 characters).
 */
export async function sha256Stream(stream: NodeJS.ReadableStream): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

/**
 * Generate RSA key pair (2048 bits) in PEM format.
 * Returns { privateKeyPem, publicKeyPem }.
 */
export function generateKeyPair(): { privateKeyPem: string; publicKeyPem: string } {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  return { privateKeyPem: privateKey, publicKeyPem: publicKey };
}

/**
 * Sign data with RSA-PSS using SHA-256.
 * The data is the exact PDF bytes (not a pre-hash).
 * createSign('sha256') hashes internally - do not pre-hash.
 * Returns base64-encoded signature.
 */
export function sign(data: Buffer, privateKeyPem: string): string {
  return createSign('sha256')
    .update(data)
    .sign({ key: privateKeyPem, ...PSS_PADDING }, 'base64');
}

/**
 * Verify RSA-PSS signature over data with SHA-256.
 * The data is the exact PDF bytes (same as passed to sign).
 * Returns true if valid, false otherwise.
 */
export function verify(data: Buffer, signature: string, publicKeyPem: string): boolean {
  return createVerify('sha256')
    .update(data)
    .verify({ key: publicKeyPem, ...PSS_PADDING }, signature, 'base64');
}

/**
 * Load a private key from KEYS_DIR by keyId.
 * Expects file at KEYS_DIR/{keyId}.pem
 */
export function loadPrivateKey(keyId: string): string {
  const keysDir = process.env.KEYS_DIR || './keys';
  const keyPath = join(keysDir, `${keyId}.pem`);
  return readFileSync(keyPath, 'utf8');
}
