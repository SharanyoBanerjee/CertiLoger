# Crypto Package: SHA-256 and RSA-PSS

## What This Package Does

`packages/crypto` provides the **production** cryptographic primitives for CertiLedger:
- SHA-256 hashing (sync and streaming)
- RSA-2048 key pair generation (PEM format)
- RSA-PSS signing and verification with SHA-256

**Critical rule**: This package **never imports** `packages/number-theory`. The toy RSA and number-theory lab are purely educational. Real signing uses Node's vetted `crypto` module.

---

## API

### `sha256(data: Buffer): string`
Returns hex-encoded SHA-256 hash (64 chars).

### `sha256Stream(stream: ReadableStream): Promise<string>`
Hashes a stream chunk-by-chunk. Used for large PDF uploads without loading entire file into memory.

### `generateKeyPair(): { privateKeyPem, publicKeyPem }`
Generates RSA-2048 key pair.
- Private key: PKCS#8 PEM
- Public key: SPKI PEM

### `sign(data: Buffer, privateKeyPem: string): string`
Signs **raw bytes** with RSA-PSS (SHA-256, salt length = digest length = 32 bytes).
Returns base64-encoded signature.

### `verify(data: Buffer, signature: string, publicKeyPem: string): boolean`
Verifies RSA-PSS signature over **raw bytes**. Returns `true`/`false`.

### `loadPrivateKey(keyId: string): string`
Loads private key from `KEYS_DIR/{keyId}.pem`. Keys never in repo, never in frontend.

---

## What Gets Signed (Critical Design Decision)

**We sign the exact PDF bytes, not a pre-computed hash.**

```ts
// packages/crypto/src/index.ts
export const sign = (data: Buffer, privateKeyPem: string) =>
  createSign('sha256').update(data).sign({ key: privateKeyPem, ...pss }, 'base64');
```

`createSign('sha256')` **hashes internally**. If we passed a pre-hash, we'd get `SHA256(SHA256(pdf))` — double hashing, which is wrong.

The separate `sha256(pdfBytes)` result is stored on the ledger as the quick "did the file change?" check. Verification re-hashes the uploaded PDF and compares to the ledger hash **and** verifies the signature over the raw bytes.

---

## Key Size & Parameters

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| RSA modulus | 2048 bits | Minimum for demo; 3072+ for anything beyond |
| Padding | RSA-PSS | RFC 8017, probabilistic, prevents Bleichenbacher |
| Hash | SHA-256 | FIPS 180-4, 256-bit output |
| Salt length | Digest length (32 bytes) | `RSA_PSS_SALTLEN_DIGEST`, max security |

---

## Why RSA-PSS, Not PKCS#1 v1.5 or Textbook RSA

| Scheme | Status |
|--------|--------|
| Textbook RSA (`m^d mod n`) | **Insecure**: deterministic, malleable, no padding |
| PKCS#1 v1.5 | Legacy, vulnerable to Bleichenbacher-style attacks |
| **RSA-PSS** | **Standard** (RFC 8017), randomized salt, proven secure in ROM |

Our `sign`/`verify` use `RSA_PKCS1_PSS_PADDING` with `RSA_PSS_SALTLEN_DIGEST`.

---

## Running Tests

```bash
npm run test --workspace=packages/crypto
```

Tests cover:
- SHA-256 correctness (known vectors, streaming)
- Key pair generation (PEM format, uniqueness)
- Sign/verify: valid passes, flipped byte fails, wrong key fails, tampered signature fails
- Probabilistic signatures differ each time
- **No double-hash**: signing raw bytes vs pre-hash proves we don't double-hash
- Large data (10 KB simulates PDF)

---

## Security Notes

- Private keys live only in `KEYS_DIR` (gitignored, never in repo)
- `loadPrivateKey` reads at sign time; keys never in memory longer than needed
- `verify` takes public key from registry (DB/ledger), **never from PDF**
- Streaming hash avoids memory pressure on large uploads
- All crypto via `node:crypto` — no custom implementations