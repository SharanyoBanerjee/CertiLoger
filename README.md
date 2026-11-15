# CertiLedger

> **Academic prototype** — Fictional institutions, synthetic data. No legal recognition, no real government integration, not production ready.

A certificate issuance and verification platform where approved institutions issue digitally signed certificates, and anyone can verify three things about a PDF:

1. **Who issued it** — Digital signature + issuer registry
2. **Whether it changed** — SHA-256 of the exact bytes
3. **Whether it's still valid** — Latest ledger status (issued, revoked, expired)

**Personal data and PDFs stay off the ledger.** The ledger holds only the minimum proof: certificate ID, issuer ID, document hash, signature, key ID, timestamps, status.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Quick Start](#quick-start)
- [Certificate Issuance Flow](#certificate-issuance-flow)
- [Certificate Verification](#certificate-verification)
- [Key Management](#key-management)
- [Ledger (LocalLedger)](#ledger-localledger)
- [Number Theory Lab](#number-theory-lab)
- [Roles & Permissions](#roles--permissions)
- [Security Model](#security-model)
- [API Reference](#api-reference)
- [Project Structure](#project-structure)
- [Limitations](#limitations)

---

## Architecture Overview

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

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS | User interface |
| Backend | Node.js, Express, TypeScript | REST API |
| Database | PostgreSQL + Prisma ORM | Persistent storage |
| Crypto | Node.js `crypto` (built-in) | SHA-256, RSA-PSS, Key generation |
| Ledger | Custom `LocalLedger` (PostgreSQL) | Hash-chained log |
| PDF | `pdf-lib` | Certificate template rendering |
| QR | `qrcode` | Verification URL encoding |
| Testing | Vitest + Supertest | Unit & integration tests |

---

## Quick Start

### Prerequisites
- Node.js 20+
- Docker (for PostgreSQL)

### Setup

```bash
# 1. Clone & install
git clone https://github.com/SharanyoBanerjee/CertiLoger
cd CertiLoger
npm install

# 2. Start PostgreSQL
docker compose up -d

# 3. Configure environment
cp .env.example .env
# Edit .env with DATABASE_URL, JWT_SECRET, BASE_URL, KEYS_DIR, STORAGE_DIR

# 4. Generate Prisma client & run migrations
npm run db:generate --workspace=apps/api
npm run db:migrate --workspace=apps/api

# 5. Seed database (2 institutions, 7 users)
npm run db:seed --workspace=apps/api

# 6. Generate private keys for institutions
mkdir -p keys
# For each institution's active keyId, create KEYS_DIR/{keyId}.pem with private key
```

### Development

```bash
# Terminal 1: API
npm run dev --workspace=apps/api   # http://localhost:3000

# Terminal 2: Web
npm run dev --workspace=apps/web   # http://localhost:5173

# Run tests
npm test

# Lint & format
npm run lint
npm run format

# Build all
npm run build
```

### Test Users (password: `password123`)

| Email | Role | Institution |
|-------|------|-------------|
| netadmin@certiledger.test | NETWORK_ADMIN | — |
| instadmin@univ.test | INSTITUTION_ADMIN | INST-001 |
| instadmin@tech.test | INSTITUTION_ADMIN | INST-002 |
| issuer@univ.test | ISSUER | INST-001 |
| issuer@tech.test | ISSUER | INST-002 |
| holder@test.test | HOLDER | INST-001 |
| auditor@test.test | AUDITOR | — |

---

## Certificate Issuance Flow

```
┌─────────────┐
│  ISSUER     │
│  (logged in)│
└──────┬──────┘
       │ POST /api/certificates
       ▼
┌────────────────────────────────────────────────────────────────┐
│ 1. VALIDATE INPUT (zod)                                        │
│    - institutionId, holderName, qualification, grade?, expiresAt? │
└────────────────────────┬───────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────────────┐
│ 2. CHECK AUTHORIZATION                                          │
│    - requireAuth + requireRole('ISSUER')                        │
│    - requireInstitutionAccess (caller's institutionId matches) │
└────────────────────────┬───────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────────────┐
│ 3. GET ACTIVE SIGNING KEY                                       │
│    - getActiveKey(institutionId) → { keyId, publicKeyPem }     │
└────────────────────────┬───────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────────────┐
│ 4. GENERATE CERTIFICATE ID                                      │
│    CERT-XXXXXX (6 random hex chars)                             │
└────────────────────────┬───────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────────────┐
│ 5. CREATE CERTIFICATE RECORD (PENDING)                          │
│    - status: PENDING, documentHash: null, signature: null      │
└────────────────────────┬───────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────────────┐
│ 6. RENDER PDF                                                   │
│    - Template: Institution name, holder name, qualification,   │
│      grade, date, certificate ID, QR code                       │
│    - QR encodes: {BASE_URL}/verify/{certificateId}             │
└────────────────────────┬───────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────────────┐
│ 7. HASH PDF BYTES (SHA-256)                                     │
│    - sha256(pdfBytes) → hex string (64 chars)                  │
└────────────────────────┬───────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────────────┐
│ 8. SIGN PDF BYTES (RSA-PSS)                                     │
│    - Load private key from KEYS_DIR/{keyId}.pem                │
│    - sign(pdfBytes, privateKeyPem) → base64 signature          │
│    - Uses node:crypto with RSA-PSS, SHA-256                    │
└────────────────────────┬───────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────────────┐
│ 9. COMMIT TO LEDGER                                             │
│    - ledger.issueCertificate({                                  │
│        certificateId, issuerId, documentHash,                  │
│        signature, keyId, issuedAt, expiresAt, status: ISSUED   │
│      })                                                         │
│    - Hash-chained entry with prevHash → entryHash              │
│    - Serializable transaction prevents concurrent writes       │
└────────────────────────┬───────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────────────┐
│ 10. ON SUCCESS: UPDATE CERTIFICATE → ISSUED                     │
│     - status: ISSUED, documentHash, keyId, txId                │
│     - Create CertificateEvent (ISSUED) + AuditLog              │
└────────────────────────┬───────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────────────┐
│ 11. RETURN PDF                                                  │
│     - Content-Type: application/pdf                             │
│     - Content-Disposition: attachment                          │
└────────────────────────┬───────────────────────────────────────┘
                         │
                         ▼
                    FAILED? → Mark certificate FAILED, throw error
```

**Critical Security Rule:** Never mark certificate `ISSUED` before ledger commit succeeds. If ledger fails, certificate stays `FAILED`.

---

## Certificate Verification

### Check Order (cheap & decisive first)

| Step | Check | Without PDF | With PDF |
|------|-------|-------------|----------|
| 1 | Certificate exists on ledger | ✓ | ✓ |
| 2 | Issuer & key trusted | ✓ | ✓ |
| 3 | Document hash matches | ✗ | ✓ |
| 4 | Digital signature valid | ✗ | ✓ |
| 5 | Not revoked | ✓ | ✓ |
| 6 | Not expired | ✓ | ✓ |

### Outcomes

| Outcome | Meaning |
|---------|---------|
| `VALID` | All checks passed |
| `NOT_FOUND` | No matching certificate on ledger |
| `DOCUMENT_MISMATCH` | Uploaded file hash ≠ ledger hash |
| `SIGNATURE_INVALID` | Signature verification failed |
| `ISSUER_UNTRUSTED` | Issuer disabled or key compromised |
| `REVOKED` | Certificate explicitly revoked |
| `EXPIRED` | `expiresAt` in the past |
| `UNAVAILABLE` | Ledger unreachable (never means valid/invalid) |

### Response Format

```json
{
  "status": "VALID",
  "checks": [
    { "name": "Certificate found on ledger", "passed": true, "reason": "Found" },
    { "name": "Issuer and signing key trusted", "passed": true, "reason": "Trusted" },
    { "name": "Document hash matches", "passed": true, "reason": "Hash matches" },
    { "name": "Digital signature valid", "passed": true, "reason": "Signature valid" },
    { "name": "Not revoked", "passed": true, "reason": "Active" },
    { "name": "Not expired", "passed": true, "reason": "Valid until 2027-01-15" }
  ],
  "certificate": {
    "id": "CERT-7F92A1",
    "issuer": "University of CertiLedger",
    "issuedAt": "2026-01-15T00:00:00Z",
    "expiresAt": "2027-01-15T00:00:00Z",
    "keyId": "INST-001-KEY-01"
  }
}
```

---

## Key Management

### Key Lifecycle

```
ACTIVE ──► RETIRED ──► (still verifies old certs)
   │
   └──► COMPROMISED ──► (invalidates all certs using this key)
```

- **ACTIVE** — Current signing key for new certificates
- **RETIRED** — No longer used for new certs, but verifies old ones
- **COMPROMISED** — Key material exposed; all certs signed with it become untrusted

### Key Registration (INSTITUTION_ADMIN only)

- `POST /api/keys/register` — Register public key for own institution
- `PATCH /api/keys/:keyId/status` — Update status (ACTIVE/RETIRED/COMPROMISED)

---

## Ledger (LocalLedger)

### Hash-Chained Design

```
Entry N:    entryHash = SHA256(prevHash + canonicalJSON({type, subjectId, payload, at}))
Entry N+1:  prevHash = entryHash of Entry N
```

**Genesis entry:** `prevHash = "0".repeat(64)`

### Tamper Detection

- `verifyChain()` walks entries in order, recomputes each hash
- Any edited row breaks every subsequent hash
- Serializable transactions prevent concurrent writes

### Operations

| Operation | Type | Validations |
|-----------|------|-------------|
| `registerIssuer` | ISSUER_REGISTERED | Unique issuerId |
| `setIssuerStatus` | ISSUER_STATUS_UPDATED | Issuer exists |
| `registerIssuerKey` | KEY_REGISTERED | Issuer ACTIVE, unique keyId |
| `setKeyStatus` | KEY_STATUS_UPDATED | Key exists |
| `issueCertificate` | ISSUED | Issuer ACTIVE, key ACTIVE, no duplicate ID |
| `revokeCertificate` | REVOKED | Cert exists, status ISSUED |
| `getCertificate` | — | Latest status from REVOKED entry |
| `getHistory` | — | All entries for certificateId |
| `verifyChain` | — | Recomputes all hashes |

---

## Number Theory Lab

Pure TypeScript package (`packages/number-theory/`) — **never used in production crypto**.

| Algorithm | Description |
|-----------|-------------|
| `gcd` | Euclidean algorithm with step table |
| `extendedGcd` | Bézout coefficients (x, y) |
| `modInverse` | Returns null if gcd ≠ 1 |
| `totient` | φ(n) for prime products + general trial division |
| `modExp` | Repeated squaring with step table |
| `isPrimeTrial` | Trial division up to √n |
| `millerRabin` | Probabilistic, configurable rounds |
| `toyRsaGenerate/Sign/Verify` | Textbook RSA (educational only) |

**Exposed via:** `/api/lab/*` endpoints for the Lab page.

---

## Roles & Permissions

| Role | Can Do |
|------|--------|
| NETWORK_ADMIN | Register/disable institutions, view all keys, ledger explorer |
| INSTITUTION_ADMIN | Manage users, templates, signing keys (own institution) |
| ISSUER | Create, issue, revoke certificates (own institution) |
| HOLDER | View, download, share own certificates |
| VERIFIER (public) | Verify by ID or PDF upload |
| AUDITOR | Read issuance/revocation history, ledger explorer |

**Enforcement:** Every protected route has `requireAuth` + `requireRole(...)`. Frontend hiding buttons is NOT security.

---

## Security Model

| Rule | Implementation |
|------|----------------|
| Private keys never in frontend/git/logs | Stored in `KEYS_DIR` on server only; loaded at sign time |
| `.env`, `keys/`, `storage/` gitignored | Enforced by `.gitignore` |
| No PDFs/PII on ledger | Only hashes, IDs, signatures on ledger |
| Standard crypto only | Node.js `crypto` (RSA-PSS, SHA-256), never custom |
| Toy RSA never in production | `packages/number-theory` never imported by crypto/verify paths |
| RSA-PSS only | Never PKCS#1 v1.5 or textbook RSA |
| Auth + RBAC on every route | `requireAuth` + `requireRole(...)` middleware |
| Verification never returns VALID on failure | `UNAVAILABLE` for ledger errors, never VALID/INVALID |
| Never mark ISSUED before ledger commit | Try/catch with FAILED fallback |
| Public key from registry only | Never from uploaded PDF |
| Rate-limited verify endpoint | Prevents hash correlation attacks |

---

## API Reference

### Authentication
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/auth/login` | public | Get JWT |
| POST | `/api/auth/refresh` | public | Refresh access token |
| GET | `/api/auth/me` | any | Current user |

### Institutions
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/institutions` | NETWORK_ADMIN | Register institution |
| GET | `/api/institutions` | any auth | List institutions |
| PATCH | `/api/institutions/:id/status` | NETWORK_ADMIN | Enable/disable |

### Keys
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/keys/register` | INSTITUTION_ADMIN | Register public key |
| GET | `/api/keys` | any auth | List keys (scoped) |
| PATCH | `/api/keys/:keyId/status` | INSTITUTION_ADMIN | Update key status |

### Certificates
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/certificates` | ISSUER | Issue certificate |
| GET | `/api/certificates` | ISSUER/HOLDER | List certificates |
| POST | `/api/certificates/:id/verify` | public | Verify certificate |
| POST | `/api/certificates/:id/revoke` | ISSUER/INST_ADMIN | Revoke certificate |

### Number Theory Lab
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/lab/gcd` | public | GCD with steps |
| GET | `/api/lab/extended-gcd` | public | Extended GCD with Bézout |
| GET | `/api/lab/mod-inverse` | public | Modular inverse |
| GET | `/api/lab/totient` | public | Euler's totient |
| GET | `/api/lab/mod-exp` | public | Fast modular exponentiation |
| GET | `/api/lab/is-prime-trial` | public | Trial division primality |
| GET | `/api/lab/miller-rabin` | public | Miller-Rabin primality |
| GET | `/api/lab/toy-rsa/generate` | public | Toy RSA key generation |
| GET | `/api/lab/toy-rsa/sign` | public | Toy RSA sign |
| GET | `/api/lab/toy-rsa/verify` | public | Toy RSA verify |
| GET | `/api/lab/check-euler` | public | Euler's theorem check |
| GET | `/api/lab/check-fermat` | public | Fermat's Little Theorem check |

---

## Project Structure

```
certiledger/
├── apps/
│   ├── web/                 # React frontend (Vite + React + TS + Tailwind)
│   │   ├── src/
│   │   │   ├── pages/       # Landing, Login, Verify, Dashboard, Issue, Certificates, Keys, Institutions, Ledger, Lab
│   │   │   ├── components/  # UI components (Button, Input, Card, Table, Modal, Badge, etc.)
│   │   │   ├── hooks/       # useAuth
│   │   │   ├── api/         # API client
│   │   │   └── components/ui/ # Reusable UI primitives
│   │   └── ...
│   └── api/                 # Express backend
│       ├── src/
│       │   ├── routes/      # /api/auth, /api/institutions, /api/keys, /api/certificates, /api/lab
│       │   ├── middleware/  # auth, rbac, validate, errorHandler
│       │   ├── services/    # auth, institution, certificate, pdf, audit, crypto
│       │   ├── config/      # env, prisma
│       │   └── index.ts
│       └── ...
├── packages/
│   ├── number-theory/       # Pure TS educational algorithms (GCD, modExp, Miller-Rabin, toy RSA)
│   ├── crypto/              # SHA-256, RSA-PSS sign/verify, key generation (wraps node:crypto)
│   └── ledger/              # LedgerService interface + LocalLedger implementation
├── prisma/
│   └── schema.prisma        # Database schema
├── docs/                    # Documentation
│   ├── PRD.md               # Product Requirements Document
│   ├── Architecture.md      # Technical architecture decisions
│   ├── Rules.md             # Binding development rules
│   ├── Phases.md            # Development phases & checklist
│   ├── Design.md            # UI/UX design system
│   └── ARCHITECTURE_OVERVIEW.md # This document
├── docker-compose.yml       # PostgreSQL
├── .env.example             # Environment template
└── package.json             # npm workspaces root
```

---

## Limitations (Academic Prototype)

- ❌ No legal recognition for participating institutions
- ❌ A valid signature doesn't prove claims are true
- ❌ Ledger can't stop an authorized but dishonest issuer
- ❌ A QR code is a pointer, not security
- ❌ A stolen private key can be abused until detected
- ❌ Raw-byte hashing rejects a harmlessly re-saved PDF
- ❌ No production deployment, no government integration
- ❌ Single-node LocalLedger (honest limit: one Postgres owner can rewrite chain)

---

## Further Reading

- `docs/PRD.md` — Product Requirements Document
- `docs/Architecture.md` — Technical architecture decisions
- `docs/Rules.md` — Binding development rules
- `docs/Phases.md` — Development phases & checklist
- `docs/Design.md` — UI/UX design system
- `docs/number-theory/*.md` — Algorithm explanations
- `docs/crypto.md` — What bytes are signed and why

---

*Built as an academic prototype by Sharanyo Banerjee & teammate. For educational purposes only.*