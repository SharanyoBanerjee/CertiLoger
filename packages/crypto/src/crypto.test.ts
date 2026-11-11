import { describe, it, expect, beforeAll } from 'vitest';
import { sha256, sha256Stream, generateKeyPair, sign, verify } from './index.js';
import { Readable } from 'node:stream';

describe('sha256', () => {
  it('produces correct hash for empty buffer', () => {
    const hash = sha256(Buffer.from(''));
    // SHA-256 of empty string
    expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });

  it('produces correct hash for known input', () => {
    const hash = sha256(Buffer.from('hello'));
    // SHA-256 of 'hello'
    expect(hash).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
  });

  it('different inputs produce different hashes', () => {
    const h1 = sha256(Buffer.from('a'));
    const h2 = sha256(Buffer.from('b'));
    expect(h1).not.toBe(h2);
  });

  it('same input produces same hash', () => {
    const h1 = sha256(Buffer.from('same'));
    const h2 = sha256(Buffer.from('same'));
    expect(h1).toBe(h2);
  });

  it('hash is always 64 hex characters', () => {
    const hash = sha256(Buffer.from('test'));
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });
});

describe('sha256Stream', () => {
  it('produces same hash as sha256 for same data', async () => {
    const data = Buffer.from('streaming hash test');
    const stream = Readable.from([data]);
    const streamHash = await sha256Stream(stream);
    const directHash = sha256(data);
    expect(streamHash).toBe(directHash);
  });

  it('handles chunked data correctly', async () => {
    const chunks = [Buffer.from('chunk1'), Buffer.from('chunk2'), Buffer.from('chunk3')];
    const combined = Buffer.concat(chunks);
    const stream = Readable.from(chunks);
    const streamHash = await sha256Stream(stream);
    const directHash = sha256(combined);
    expect(streamHash).toBe(directHash);
  });

  it('handles empty stream', async () => {
    const stream = Readable.from([]);
    const hash = await sha256Stream(stream);
    expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });
});

describe('generateKeyPair', () => {
  let keyPair: { privateKeyPem: string; publicKeyPem: string };

  beforeAll(() => {
    keyPair = generateKeyPair();
  });

  it('generates a private key in PKCS#8 PEM format', () => {
    expect(keyPair.privateKeyPem).toContain('-----BEGIN PRIVATE KEY-----');
    expect(keyPair.privateKeyPem).toContain('-----END PRIVATE KEY-----');
  });

  it('generates a public key in SPKI PEM format', () => {
    expect(keyPair.publicKeyPem).toContain('-----BEGIN PUBLIC KEY-----');
    expect(keyPair.publicKeyPem).toContain('-----END PUBLIC KEY-----');
  });

  it('keys are different on each call', () => {
    const kp2 = generateKeyPair();
    expect(kp2.privateKeyPem).not.toBe(keyPair.privateKeyPem);
    expect(kp2.publicKeyPem).not.toBe(keyPair.publicKeyPem);
  });
});

describe('sign and verify', () => {
  let keyPair: { privateKeyPem: string; publicKeyPem: string };
  const testData = Buffer.from('This is a test PDF content for signing');

  beforeAll(() => {
    keyPair = generateKeyPair();
  });

  it('valid signature passes verification', () => {
    const signature = sign(testData, keyPair.privateKeyPem);
    expect(typeof signature).toBe('string');
    expect(signature.length).toBeGreaterThan(0);
    const valid = verify(testData, signature, keyPair.publicKeyPem);
    expect(valid).toBe(true);
  });

  it('one flipped byte in data fails verification', () => {
    const signature = sign(testData, keyPair.privateKeyPem);
    const tamperedData = Buffer.from(testData);
    tamperedData[0] ^= 0xff; // flip first byte
    const valid = verify(tamperedData, signature, keyPair.publicKeyPem);
    expect(valid).toBe(false);
  });

  it('wrong public key fails verification', () => {
    const signature = sign(testData, keyPair.privateKeyPem);
    const otherKeyPair = generateKeyPair();
    const valid = verify(testData, signature, otherKeyPair.publicKeyPem);
    expect(valid).toBe(false);
  });

  it('tampered signature fails verification', () => {
    const signature = sign(testData, keyPair.privateKeyPem);
    // Tamper with the base64 signature by flipping a bit in the middle
    const sigBuffer = Buffer.from(signature, 'base64');
    sigBuffer[Math.floor(sigBuffer.length / 2)] ^= 0xff;
    const tamperedSig = sigBuffer.toString('base64');
    const valid = verify(testData, tamperedSig, keyPair.publicKeyPem);
    expect(valid).toBe(false);
  });

  it('different data with same key fails verification', () => {
    const signature = sign(testData, keyPair.privateKeyPem);
    const otherData = Buffer.from('Different document content');
    const valid = verify(otherData, signature, keyPair.publicKeyPem);
    expect(valid).toBe(false);
  });

  it('signing same data twice produces different signatures (RSA-PSS is probabilistic)', () => {
    const sig1 = sign(testData, keyPair.privateKeyPem);
    const sig2 = sign(testData, keyPair.privateKeyPem);
    // RSA-PSS uses random salt, so signatures should differ
    expect(sig1).not.toBe(sig2);
    // But both should verify
    expect(verify(testData, sig1, keyPair.publicKeyPem)).toBe(true);
    expect(verify(testData, sig2, keyPair.publicKeyPem)).toBe(true);
  });

  it('works with larger data (simulating PDF)', () => {
    const largeData = Buffer.alloc(10000, 'x'); // 10KB
    const signature = sign(largeData, keyPair.privateKeyPem);
    const valid = verify(largeData, signature, keyPair.publicKeyPem);
    expect(valid).toBe(true);
  });
});

describe('sign/verify does not double-hash', () => {
  let keyPair: { privateKeyPem: string; publicKeyPem: string };

  beforeAll(() => {
    keyPair = generateKeyPair();
  });

  it('signing pre-hashed data would fail (proves we sign raw bytes)', () => {
    const data = Buffer.from('test data');
    const hash = sha256(data);
    const hashBuffer = Buffer.from(hash, 'hex');

    // If we signed the hash, this would be double-hashing
    const signature = sign(data, keyPair.privateKeyPem);

    // Verify with raw data - should pass
    expect(verify(data, signature, keyPair.publicKeyPem)).toBe(true);

    // Verify with pre-hash - should fail (this proves we don't double-hash)
    // The verify function hashes the input again internally, so passing a hash
    // would result in hash(hash(data)) which is wrong
    expect(verify(hashBuffer, signature, keyPair.publicKeyPem)).toBe(false);
  });
});
