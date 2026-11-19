# CertiLedger Final Report

> Academic prototype. Fictional institutions, synthetic data. No legal recognition, no real government integration, not production ready.

---

## 1. Project Overview

**CertiLedger** is a certificate issuance and verification platform where approved institutions issue digitally signed certificates, and anyone can verify three things about a PDF:

1. **Who issued it** (digital signature + issuer registry)
2. **Whether it changed** (SHA-256 of the exact bytes)
3. **Whether it's still valid** (latest ledger status: issued, revoked, expired)

**Personal data and PDFs stay off the ledger.** The ledger holds only the minimum proof: certificate ID, issuer ID, document hash, signature, key ID, timestamps, status.

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CertiLedger System                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐     REST/JSON      ┌──────────────────────────────────┐  │
│  │   React Web  │ ◄────────────────► │          Express API             │  │
│  │  (Vite/TS)   │                    │            (TypeScript)          │  │
│  └──────────────┘                    └──────────────┬───────────────────┘  │
│                                                      │                      │
│         ┌───────────────────────────────────────────┼───────────────────┐  │
│         │                                           │                   │  │
│    ┌────▼────┐    ┌───────────┐    ┌────────────┐   │   ┌──────────┐   │  │
│    │PostgreSQL│    │  Crypto   │    │  Ledger    │   │   │ File     │   │  │
│    │ (Prisma) │    │  Package  │    │  Service   │   │   │ Storage  │   │  │
│    └─────────┘    └───────────┘    └────────────┘   │   └──────────┘   │  │
│         │                                           │                   │  │
│    Users, Certs,     SHA-256, RSA-PSS,          LocalLedger          PDFs,          │  │
│    Keys, Events,     Key Generation,              (hash-chained)       Outside Git   │  │
│    Audit Logs        Load from KEYS_DIR                                               │  │
│         │                                           │                   │  │
│         └───────────────────────────────────────────┴───────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL + Prisma ORM |
| Crypto | Node.js `crypto` (built-in) |
| Ledger | Custom `LocalLedger` (PostgreSQL, hash-chained) |
| PDF | `pdf-lib` |
| QR | `qrcode` |
| Testing | Vitest + Supertest |

---

## 3. Implemented Features

### 3.1 Certificate Issuance (Commit 9, 11)

- **POST `/api/certificates`** — Full issuance flow:
  1. Validate input (zod)
  2. Check caller authorization (ISSUER + institution scoping)
  3. Get institution's active signing key
  4. Generate certificate ID (`CERT-XXXXXX`)
  5. Create certificate record with `PENDING` status
  6. Render PDF with certificate ID and QR code
  7. Hash PDF bytes (SHA-256)
  8. Sign PDF bytes (RSA-PSS, private key from `KEYS_DIR`)
  8. Commit to ledger (`LocalLedger.issueCertificate`)
  9. On success: update certificate → `ISSUED` with `documentHash`, `keyId`, `txId`
  10. On failure: mark certificate → `FAILED`
  11. Return PDF as downloadable attachment

**Security:** Never marks `ISSUED` before ledger commit; private keys read from `KEYS_DIR` on server only; role checks on every route.

### 3.2 Certificate Verification (Commit 12)

- **POST `/api/certificates/:id/verify`** — Implements exact check order from Architecture.md:
  1. `LEDGER_LOOKUP` → certificate exists?
  2. `ISSUER_STATUS` → issuer exists and ACTIVE?
  3. `KEY_STATUS` → key exists and not COMPROMISED?
  4. `DOCUMENT_HASH` → upload hash matches ledger? (if file uploaded)
  5. `SIGNATURE` → verify signature with public key? (if file uploaded)
  6. `REVOCATION_STATUS` → status ≠ REVOKED?
  7. `EXPIRY` → expiresAt not in past?

**Outcomes:** `VALID`, `NOT_FOUND`, `ISSUER_UNTRUSTED`, `DOCUMENT_MISMATCH`, `SIGNATURE_INVALID`, `REVOKED`, `EXPIRED`, `UNAVAILABLE`, `FILE_NOT_CHECKED`

### 3.3 Certificate Revocation (Commit 12)

- **POST `/api/certificates/:id/revoke`** — ISSUER/INSTITUTION_ADMIN can revoke:
  1. Check certificate exists and belongs to caller's institution
  2. Status must be `ISSUED`
  3. Write revocation to ledger (must commit)
  4. On success: update DB status → `REVOKED`, write `CertificateEvent` + `AuditLog`

### 3.4 Institution & Key Management (Commits 6, 8)

- **Institutions:** `POST /api/institutions` (NETWORK_ADMIN), `GET /api/institutions`, `PATCH /api/institutions/:id/status`
- **Keys:** `POST /api/keys/register` (INSTITUTION_ADMIN), `GET /api/keys`, `PATCH /api/keys/:keyId/status`
- Key lifecycle: `ACTIVE` → `RETIRED` → `COMPROMISED`

### 3.5 Number Theory Lab (Commits 3, 4, 7)

Pure TypeScript package (`packages/number-theory/`) — **never used in production crypto**.

| Algorithm | Description | API Endpoint |
|-----------|-------------|--------------|
| `gcd` | Euclidean algorithm with step table | `/api/lab/gcd` |
| `extendedGcd` | Bézout coefficients (x, y) | `/api/lab/extended-gcd` |
| `modInverse` | Returns null if gcd ≠ 1 | `/api/lab/mod-inverse` |
| `totient` | φ(n) for prime products + trial division | `/api/lab/totient` |
| `modExp` | Repeated squaring with step table | `/api/lab/mod-exp` |
| `isPrimeTrial` | Trial division up to √n | `/api/lab/is-prime-trial` |
| `millerRabin` | Probabilistic, configurable rounds | `/api/lab/miller-rabin` |
| `toyRsaGenerate` | Textbook RSA key generation | `/api/lab/toy-rsa/generate` |
| `toyRsaSign` | Textbook RSA sign | `/api/lab/toy-rsa/sign` |
| `toyRsaVerify` | Textbook RSA verify | `/api/lab/toy-rsa/verify` |
| `checkEuler` | Euler's theorem check | `/api/lab/check-euler` |
| `checkFermat` | Fermat's Little Theorem check | `/api/lab/check-fermat` |

**Math Section** (from teammate's docs):

> **Euclidean Algorithm (GCD):**
> The greatest common divisor (GCD) of two integers is the largest positive integer that divides both. Euclid's algorithm computes it efficiently using the identity: `gcd(a, b) = gcd(b, a mod b)`.
>
> **Extended Euclidean Algorithm (Bézout's Identity):**
> For any integers `a, b`, there exist integers `x, y` such that: `a·x + b·y = gcd(a, b)`. The extended algorithm finds these coefficients by working backwards through Euclid's steps.
>
> **Modular Inverse:**
> The modular inverse of `a` modulo `n` is an integer `x` such that `a·x ≡ 1 (mod n)`. This exists **iff** `gcd(a, n) = 1`. From Bézout: `a·x + n·y = 1` → `a·x ≡ 1 (mod n)`.
>
> **Fast Modular Exponentiation (Repeated Squaring):**
> Write exponent in binary. For each bit from LSB to MSB: square the base, multiply result if bit is 1. O(log e) multiplications vs O(e) naive.
>
> **Euler's Theorem:**
> If `gcd(a, n) = 1`, then `a^φ(n) ≡ 1 (mod n)`. Generalizes Fermat's Little Theorem.
>
> **Toy RSA (Educational Only):**
> Textbook RSA: `c = m^d mod n`, `m = c^e mod n`. Deterministic, malleable, no padding — **never use in production**. Production uses RSA-PSS with SHA-256 via `node:crypto`.

### 3.6 Ledger (Commit 10)

**LocalLedger** — Hash-chained ledger in PostgreSQL:

```
entryHash = SHA256(prevHash + canonicalJSON({type, subjectId, payload, at}))
```

- Genesis: `prevHash = "0".repeat(64)`
- Serializable transactions prevent concurrent writes
- `verifyChain()` walks entries, recomputes hashes — any tampering breaks chain
- Operations: `registerIssuer`, `setIssuerStatus`, `registerIssuerKey`, `setKeyStatus`, `issueCertificate`, `revokeCertificate`, `getCertificate`, `getHistory`, `verifyChain`

**Crypto Section** (from teammate's docs):

> **SHA-256:**
> `createHash('sha256').update(data).digest('hex')` — Returns 64-char hex string.
>
> **RSA-PSS Signing:**
> `createSign('sha256').update(data).sign({key: privateKeyPem, padding: PSS_PADDING}, 'base64')`
> - `data` = exact PDF bytes (not pre-hashed)
> - `createSign('sha256')` hashes internally — do not pre-hash
>
> **RSA-PSS Verification:**
> `createVerify('sha256').update(data).verify({key: publicKeyPem, padding: PSS_PADDING}, signature, 'base64')`
>
> **Key Generation:**
> `generateKeyPairSync('rsa', {modulusLength: 2048, publicKeyEncoding: {type: 'spki', format: 'pem'}, privateKeyEncoding: {type: 'pkcs8', format: 'pem'}})`

---

## 4. Security Model

### Implemented Controls

| Control | Implementation |
|---------|----------------|
| **Private keys** | Stored in `KEYS_DIR` on server only; never in frontend, git, logs, API responses |
| **Gitignored** | `.env`, `keys/`, `storage/`, `node_modules/`, `dist/` |
| **No PII on ledger** | Only certId, issuerId, docHash, signature, keyId, timestamps, status |
| **Standard crypto only** | Node.js `crypto` (RSA-PSS, SHA-256), never custom |
| **Toy RSA isolation** | `packages/number-theory` never imported by crypto/verify paths |
| **RSA-PSS only** | Never PKCS#1 v1.5 or textbook RSA |
| **Auth + RBAC** | `requireAuth` + `requireRole(...)` on every protected route |
| **Verification safety** | `UNAVAILABLE` for ledger errors, never VALID/INVALID |
| **Ledger-first issuance** | Never mark `ISSUED` before ledger commit (try/catch with FAILED fallback) |
| **Public key from registry** | Never from uploaded PDF |

### Threat Model (from PRD)

| Threat | Mitigation |
|--------|------------|
| T1: Private key theft | Keys in `KEYS_DIR` on server only; never in frontend/git/logs |
| T2: Malicious issuer | RBAC + institution scoping + audit logs |
| T3: Certificate forgery | SHA-256 + RSA-PSS + ledger commit before ISSUED |
| T4: Ledger tampering | Hash-chained ledger + `verifyChain()` + serializable TX |
| T5: Key compromise | Key status lifecycle (ACTIVE/RETIRED/COMPROMISED) |
| T6: PII on ledger | No PII on ledger (only hashes, IDs, signatures) |

---

## 5. Testing & Quality

### Test Coverage

| Package | Tests | Coverage |
|---------|-------|----------|
| `apps/api` | 26 | Auth, institution/key management |
| `packages/crypto` | 20 | SHA-256, RSA-PSS sign/verify, key gen |
| `packages/ledger` | 34 | LocalLedger operations (1 pre-existing failure*) |
| `packages/number-theory` | 66 | All algorithms + edge cases |
| `apps/web` | 1 | Smoke test |

*\* Pre-existing failure in commit 10 (teammate's test expects "Unknown or disabled issuer" but gets "No genesis entry found" when no genesis entry exists)*

### Quality Gates

- ✅ TypeScript strict mode
- ✅ ESLint + Prettier (pre-commit)
- ✅ Vitest unit/integration tests
- ✅ Zod validation at route boundaries
- ✅ Conventional commits

---

## 6. Performance

### Measured Latencies (Local Development)

| Operation | Median | P95 | Conditions |
|-----------|--------|-----|------------|
| Certificate issuance | ~450ms | ~800ms | PDF render + hash + sign + ledger commit |
| Verification (by ID) | ~120ms | ~250ms | Ledger lookup only |
| Verification (with PDF) | ~300ms | ~500ms | Hash + signature verify + ledger |
| Ledger chain verify | ~50ms | ~100ms | 7 entries |

**Conditions:** Local PostgreSQL, Node.js 22, no load. Not production benchmarks.

---

## 7. Limitations (Academic Prototype)

- ❌ No legal recognition for participating institutions
- ❌ A valid signature doesn't prove claims are true
- ❌ Ledger can't stop an authorized but dishonest issuer
- ❌ A QR code is a pointer, not security
- ❌ A stolen private key can be abused until detected
- ❌ Raw-byte hashing rejects a harmlessly re-saved PDF
- ❌ No production deployment, no government integration
- ❌ Single-node LocalLedger (Postgres owner can rewrite chain)
- ❌ No rate limiting on verify endpoint (DoS risk)
- ❌ HS256 JWT (not RS256), no key rotation
- ❌ No CSP headers, no rate limiting, no monitoring

---

## 8. Deviations from Plan

| Planned | Actual | Reason |
|---------|--------|--------|
| Go chaincode (Fabric) | TypeScript chaincode (LocalLedger only) | Time constraints; LocalLedger sufficient for prototype |
| Rate limiting on verify | Not implemented | Scope creep; accepted risk for prototype |
| CSP headers | Not implemented | Time constraints |
| RS256 JWT | HS256 used | Simplicity for prototype |
| Rate limiting | Not implemented | Accepted risk for prototype |

---

## 9. Team Contributions

| Member | Commits | Areas |
|--------|---------|-------|
| Sharanyo Banerjee | 1, 2, 5, 6, 9, 11, 13, 15 | Architecture, auth, institutions/keys, PDF, certificate issuance, web UI, docs |
| Teammate | 3, 4, 7, 8, 10, 12, 14 | Number theory, crypto, ledger, verification, e2e tests, performance |

---

## 10. Conclusion

CertiLedger demonstrates a complete certificate issuance and verification platform with:

- **Cryptographic integrity:** SHA-256 + RSA-PSS via Node.js built-in crypto
- **Ledger integrity:** Hash-chained PostgreSQL ledger with tamper detection
- **Full lifecycle:** Issue → Verify → Revoke with audit trail
- **Educational value:** Number Theory Lab with 12 algorithms
- **Security-first design:** RBAC, institution scoping, audit logs, key lifecycle

The prototype successfully demonstrates the core concepts while clearly documenting its limitations as an academic exercise.

---

## Appendices

### A. API Reference
See `docs/ARCHITECTURE_OVERVIEW.md` → API Reference section.

### B. Setup Guide
See `docs/setup.md` for complete installation and usage instructions.

### C. Security Review
See `docs/security-review.md` for threat model mapping and security controls.

### D. Crypto & Math Details
See `docs/crypto.md` and `docs/number-theory/*.md` for algorithm explanations.

### E. Ledger Implementation
See `docs/ledger.md` for LocalLedger design and verification.

---

*Built as an academic prototype by Sharanyo Banerjee & teammate. For educational purposes only.*