# Cryptography and Mathematics Report

## 1. Mathematical Foundations

### 1.1 Modular Arithmetic and Number Theory

The CertiLedger system implements several fundamental number-theoretic algorithms in `packages/number-theory` for educational purposes (the "Number Theory Lab"). These algorithms use `BigInt` throughout to handle integers beyond JavaScript's 53-bit safe integer limit.

**Greatest Common Divisor (GCD)**: Implements Euclid's algorithm, returning both the result and the complete remainder sequence:
```
gcd(a, b) → { result: gcd, steps: [{ a, b, q, r }] }
```
Where at each step: `a = b·q + r` with `0 ≤ r < b`.

**Extended GCD**: Computes Bézout coefficients (x, y) such that `ax + by = gcd(a, b)`:
```
extendedGcd(a, b) → { gcd, x, y, steps }
```
This is the mathematical basis for modular inverses.

**Modular Inverse**: Returns `a⁻¹ mod n` when `gcd(a, n) = 1`, otherwise `null`:
```
modInverse(a, n) → BigInt | null
```
By Bézout's identity: if `ax + ny = 1`, then `x ≡ a⁻¹ (mod n)`.

### 1.2 Euler's Totient Function

For distinct primes p and q: `φ(pq) = (p-1)(q-1)`. The implementation includes both the prime-product optimized version and a general trial-division version for arbitrary n.

### 1.3 Fast Modular Exponentiation

Repeated squaring algorithm with O(log e) complexity:
```
modExp(base, exp, mod) → { result, steps: [{ step, base, exp, result }] }
```
At each step: if exp is odd, multiply result by base; square base; halve exponent.

**Why O(log e)?** Each iteration halves the exponent, so the number of iterations equals the bit-length of the exponent. For a 2048-bit exponent, only 2048 multiplications vs. 2²⁰⁴⁸ for naive approach.

### 1.4 Primality Testing

- **Trial Division**: O(√n) deterministic test
- **Miller-Rabin**: Probabilistic test with configurable rounds. For k rounds, error probability ≤ 4⁻ᵏ. With 20 rounds: error ≤ 2⁻⁴⁰ ≈ 9×10⁻¹³.

Carmichael numbers (e.g., 561) pass Fermat's test but are caught by Miller-Rabin.

### 1.5 Toy RSA (Educational Only)

Reproduces the classic textbook example: p=61, q=53, n=3233, φ=3120, e=17, d=2753.
- 65^2753 mod 3233 = 588 (sign)
- 588^17 mod 3233 = 65 (verify)

**Why textbook RSA is insecure:**
1. **Deterministic**: Same message always produces same ciphertext
2. **Malleable**: An attacker can multiply ciphertexts to produce valid new ciphertexts
3. **No padding**: Vulnerable to chosen-plaintext and chosen-ciphertext attacks
4. **Small exponent attacks**: e=3 or e=17 with same message to multiple recipients

**Production uses RSA-PSS** (Probabilistic Signature Scheme) which adds:
- Random salt per signature
- Mask Generation Function (MGF1)
- Provable security in the random oracle model

---

## 2. Production Cryptography (`packages/crypto`)

### 2.1 Hashing: SHA-256

```typescript
sha256(data: Buffer): string // Returns 64-char hex
sha256Stream(stream: Readable): Promise<string>
```

Uses Node.js built-in `crypto.createHash('sha256')`. Collision resistance: 2¹²⁸ operations (birthday bound). Preimage resistance: 2²⁵⁶ operations.

### 2.2 Key Generation: RSA 2048-bit

```typescript
generateKeyPair(): { privateKeyPem: string; publicKeyPem: string }
```

- Modulus: 2048 bits (minimum per current standards)
- Public exponent: 65537 (default)
- Encoding: SPKI (public), PKCS#8 (private), PEM format
- Private keys stored only in `KEYS_DIR` on server, never in repo

### 2.3 Signing: RSA-PSS with SHA-256

```typescript
sign(data: Buffer, privateKeyPem: string): string // base64 signature
```

**Critical design decision**: We sign the **exact PDF bytes**, not a pre-computed hash.

```typescript
createSign('sha256').update(data).sign({ key: privateKeyPem, ...PSS_PADDING }, 'base64')
```

`createSign('sha256')` **internally hashes the data** using SHA-256. Passing a pre-hash would cause double-hashing, breaking verification.

**PSS Parameters:**
- Padding: `RSA_PKCS1_PSS_PADDING`
- Salt Length: `RSA_PSS_SALTLEN_DIGEST` (32 bytes = hash length)
- MGF: MGF1-SHA256

### 2.4 Verification: RSA-PSS with SHA-256

```typescript
verify(data: Buffer, signature: string, publicKeyPem: string): boolean
```

Same internal hashing: `createVerify('sha256').update(data).verify(...)`

### 2.5 What Gets Signed and Why

**Decision**: Sign the exact PDF bytes.

**Rationale:**
1. The PDF is the legal document. Any change (even whitespace) must invalidate the signature.
2. Embedding certificate ID + QR code in PDF before hashing ensures the visual document matches the signed bytes.
3. Separate `sha256()` call stores the document hash on the ledger for quick "did the file change?" check.
4. `createSign('sha256')` handles hashing internally — no double-hashing.

**Key Size**: RSA 2048 minimum. 3072 recommended for production beyond demo.

---

## 3. Ledger Integrity: Hash Chaining

### 3.1 Chain Structure

Each `LedgerEntry` contains:
```
entryHash = SHA256( prevHash + canonicalJson({type, subjectId, payload, at}) )
```

- **Genesis**: `prevHash = "0".repeat(64)` (64 zeros)
- **Canonical JSON**: Keys sorted alphabetically at all nesting levels for deterministic serialization
- **Serializable transactions**: Prevents concurrent writes from using the same `prevHash`

### 3.2 Tamper Detection

`verifyChain()` walks entries in sequence order, recomputing each hash:
1. Any change to entry *n* changes its `entryHash`
2. This becomes `prevHash` for entry *n+1*, causing mismatch
3. Cascade: all subsequent entries fail verification
4. Returns `{ valid: false, firstBrokenIndex }`

### 3.3 Honest Limit

**One Postgres owner can rewrite the entire chain.** Since the database is centralized:
1. Modify an old entry's payload
2. Recompute its `entryHash`
3. Recompute all subsequent `entryHash` values
4. Update the table

This is exactly why **Phase 5 introduces Hyperledger Fabric**: distributed consensus makes rewriting history computationally infeasible without controlling a majority of peers.

---

## 4. Verification Logic

### 4.1 Check Order (Architecture.md Section 8)

Cheap and decisive checks first:

| Step | Check | Fail State | Reason |
|------|-------|------------|--------|
| 1 | `ledger.getCertificate(id)` | `NOT_FOUND` | No record exists |
| 2 | `ledger.getIssuer(issuerId)` | `ISSUER_UNTRUSTED` | Missing or disabled issuer |
| 3 | Key from registry for `keyId` | `ISSUER_UNTRUSTED` | Missing or COMPROMISED key |
| 4 | `sha256(upload) === record.documentHash` | `DOCUMENT_MISMATCH` | File was modified |
| 5 | `verify(upload, signature, publicKey)` | `SIGNATURE_INVALID` | Signature doesn't match |
| 6 | `record.status === REVOKED` | `REVOKED` | Certificate revoked |
| 7 | `expiresAt < now` | `EXPIRED` | Certificate expired |
| 8 | All pass (with file) | `VALID` | Fully verified |

**Why this order?** Fail fast on most common/decisive failures. Never return `VALID` if any check failed or couldn't run.

### 4.2 Key Status Semantics

- **ACTIVE**: Normal verification
- **RETIRED**: Still verifies **old** certificates (key was valid when they were signed)
- **COMPROMISED**: Fails **all** verifications (key material may have been stolen)

### 4.3 Ledger Unavailability

`LedgerUnavailableError` at **any step** → `UNAVAILABLE` overall state. Never return `VALID` or `INVALID` when ledger is unreachable.

### 4.4 Public Key Source

Always from **registry (Prisma)**, never from uploaded PDF. The PDF is untrusted input.

---

## 5. Certificate Issuance Flow

1. Authenticate + role = ISSUER
2. Validate input (zod)
3. Generate certificateId: `CERT-` + 6 random hex (retry on collision)
4. Create Certificate row: `PENDING`
5. Render PDF with ID + QR (QR encodes `{BASE_URL}/verify/{id}`)
6. `documentHash = sha256(pdfBytes)`
7. `signature = sign(pdfBytes, privateKeyPem)`
8. `ledger.issueCertificate(...)` — **must commit**
9. On success: status `ISSUED`, store `txId`, write `CertificateEvent` + `AuditLog`
10. On failure: status `FAILED`, never show as issued

---

## 6. Revocation

1. Authenticate + role = ISSUER or INSTITUTION_ADMIN
2. Certificate belongs to caller's institution
3. Status must be `ISSUED`
4. `ledger.revokeCertificate(id, reasonCode, actorId)` — must commit
5. On success: status `REVOKED`, write `CertificateEvent` + `AuditLog`
6. On failure: status unchanged, return error

---

## 7. Security Properties Summary

| Property | Mechanism |
|----------|-----------|
| **Integrity** | SHA-256 hash on ledger + RSA-PSS signature |
| **Authenticity** | RSA-PSS with institution's private key |
| **Non-repudiation** | Only institution holds private key; ledger is append-only |
| **Tamper detection** | Hash chain in LocalLedger; Fabric consensus in Phase 5 |
| **Revocation** | Ledger entry + status update; checked on every verify |
| **Key compromise** | COMPROMISED status invalidates all signatures |
| **Key retirement** | RETIRED status preserves old certificate validity |

---

## 8. Deviations and Limitations

1. **TypeScript chaincode** (Phase 5): PRD specifies Go; using TypeScript to avoid language learning during riskiest phase. Documented as deliberate deviation.

2. **LocalLedger trust model**: Centralized Postgres; honest limit = server owner. Not suitable for production without Fabric.

3. **RSA 2048**: Minimum key size. 3072 or 4096 recommended for long-term production use.

4. **No certificate transparency log**: Relies on ledger for audit trail.

5. **QR code contains only verify URL**: No personal data in QR (per security rules).

6. **Rate limiting on verify**: Prevents hash correlation attacks (hashes can link to individuals).

---

*This report drafted by AI assistant, reviewed by backend developer.*