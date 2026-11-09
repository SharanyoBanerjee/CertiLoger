# CertiLedger: Architecture

## 1. Big picture

```text
React (Vite + TS)
      |  REST (JSON, multipart for PDFs)
Express API (TS)  ── auth, RBAC, validation, orchestration
      |
  +---+-----------+----------------+
  |               |                |
Prisma/Postgres   crypto package   File storage (local disk)
(users, certs,    (SHA-256,        (PDFs, outside git)
 keys, audit)      RSA-PSS)
                      
      LedgerService (interface)
        |                    |
  LocalLedger           FabricLedger
  (Postgres,            (Fabric Gateway,
   hash-chained)         chaincode)
```

The API never talks to a ledger implementation directly. It talks to `LedgerService`. That's what lets us ship Phase 4 without Fabric and swap it in at Phase 5.

## 2. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React, Vite, TypeScript, Tailwind | Your main stack, fast dev loop |
| Backend | Node.js, Express, TypeScript | Matches AD coursework |
| DB | PostgreSQL + Prisma | Matches AD coursework |
| Crypto | Node `crypto` (built in) | Maintained, supports RSA-PSS |
| PDF | `pdf-lib` (or `pdfkit`) | Simple, no headless browser |
| QR | `qrcode` | Encodes the verify URL |
| Validation | `zod` | One schema for input and types |
| Auth | `jsonwebtoken` + `bcrypt` | Standard, simple |
| Upload | `multer` (memory or disk) | PDF upload on verify |
| Tests | `vitest` (+ `supertest` for API) | Fast, TS-native |
| Ledger (Phase 5) | Hyperledger Fabric + `@hyperledger/fabric-gateway` | Per PRD |
| Chaincode | TypeScript (PRD says Go, see note) | One language across the repo |

**Chaincode language note:** the PRD lists Go. Fabric supports TypeScript chaincode too. We're choosing TypeScript to avoid learning a new language during the riskiest phase. Document this as a deliberate deviation in the final report. Revisit if the evaluators require Go.

## 3. Repo structure

npm workspaces monorepo.

```text
certiledger/
├── docs/
│   ├── PRD.md
│   ├── Architecture.md
│   ├── Rules.md
│   ├── Phases.md
│   ├── Design.md
│   ├── Memory.md              # created when coding starts
│   ├── number-theory/         # one explainer per algorithm
│   └── crypto.md              # what bytes are signed and why
├── apps/
│   ├── web/                   # React frontend
│   │   └── src/{pages,components,api,lib}/
│   └── api/                   # Express backend
│       └── src/
│           ├── routes/        # one router per resource
│           ├── middleware/    # auth, rbac, validate, error
│           ├── services/      # certificate, verification, institution, key
│           ├── config/        # env loading
│           └── index.ts
├── packages/
│   ├── number-theory/         # educational lab (pure TS, no deps)
│   ├── crypto/                # hash, sign, verify (wraps node:crypto)
│   └── ledger/                # LedgerService, LocalLedger, FabricLedger
├── chaincode/                 # Phase 5
├── prisma/schema.prisma
├── storage/                   # PDFs, gitignored
├── keys/                      # dev private keys, gitignored
├── .env.example
└── package.json
```

**Dependency direction:** `apps/api` → `packages/*`. Packages never import from apps. `number-theory` and `crypto` never import each other (the toy RSA and real signing must never mix).

## 4. Data placement

| Data | Where |
|---|---|
| Users, password hashes, roles | Postgres |
| Holder name, grade, qualification | Postgres (off-chain) |
| PDF files | `storage/`, path in Postgres |
| Private signing keys | `keys/` on the server only |
| Public keys | Postgres `IssuerKey` **and** ledger |
| Certificate ID, issuer ID, doc hash, signature, key ID, timestamps, status | Ledger |
| Revocation reason code | Ledger (code only, no free text) |
| Audit log (logins, actions) | Postgres |

Nothing personal goes on the ledger. Hashes can correlate, so the verify endpoint stays rate-limited.

## 5. Database schema (Prisma sketch)

```prisma
enum Role { NETWORK_ADMIN INSTITUTION_ADMIN ISSUER HOLDER AUDITOR }
enum KeyStatus { ACTIVE RETIRED COMPROMISED }
enum CertStatus { PENDING ISSUED REVOKED FAILED }

model Institution {
  id        String   @id
  name      String
  status    String   // ACTIVE | DISABLED
  createdAt DateTime @default(now())
  users     User[]
  keys      IssuerKey[]
  certs     Certificate[]
}

model User {
  id            String @id @default(uuid())
  institutionId String?
  name          String
  email         String @unique
  passwordHash  String
  role          Role
}

model IssuerKey {
  keyId         String @id            // e.g. INST-001-KEY-02
  institutionId String
  publicKeyPem  String
  status        KeyStatus
  validFrom     DateTime
}

model Certificate {
  id            String @id             // CERT-7F92A1
  institutionId String
  holderName    String
  qualification String
  grade         String?
  issuedAt      DateTime?
  expiresAt     DateTime?
  documentHash  String?
  keyId         String?
  filePath      String?
  txId          String?
  status        CertStatus @default(PENDING)
  events        CertificateEvent[]
}

model CertificateEvent {
  id            String @id @default(uuid())
  certificateId String
  type          String   // ISSUED | REVOKED
  actorId       String
  reasonCode    String?
  txId          String?
  at            DateTime @default(now())
}

model AuditLog {
  id      String @id @default(uuid())
  userId  String?
  action  String
  meta    Json?
  at      DateTime @default(now())
}

// Used only by LocalLedger
model LedgerEntry {
  seq       Int    @id @default(autoincrement())
  type      String // ISSUER_REGISTERED | KEY_REGISTERED | ISSUED | REVOKED ...
  subjectId String // certificateId or issuerId
  payload   Json
  prevHash  String
  entryHash String @unique
  at        DateTime @default(now())
}
```

## 6. The ledger interface

```ts
export interface LedgerCertificate {
  certificateId: string;
  issuerId: string;
  documentHash: string;
  signature: string;      // base64
  keyId: string;
  issuedAt: string;       // ISO
  expiresAt: string | null;
  status: "ISSUED" | "REVOKED";
}

export interface LedgerService {
  registerIssuer(issuerId: string, name: string): Promise<TxResult>;
  setIssuerStatus(issuerId: string, status: "ACTIVE" | "DISABLED"): Promise<TxResult>;
  registerIssuerKey(issuerId: string, keyId: string, publicKeyPem: string): Promise<TxResult>;
  setKeyStatus(keyId: string, status: "ACTIVE" | "RETIRED" | "COMPROMISED"): Promise<TxResult>;
  issueCertificate(cert: LedgerCertificate): Promise<TxResult>;
  revokeCertificate(certificateId: string, reasonCode: string, actorId: string): Promise<TxResult>;
  getCertificate(certificateId: string): Promise<LedgerCertificate | null>;
  getIssuer(issuerId: string): Promise<LedgerIssuer | null>;
  getHistory(certificateId: string): Promise<LedgerEvent[]>;
}

export type TxResult = { txId: string; committedAt: string };
export class LedgerUnavailableError extends Error {}
```

Rules for every implementation:

- `issueCertificate` rejects unknown or disabled issuers and duplicate IDs.
- `revokeCertificate` rejects unknown IDs and already-revoked certificates.
- Methods resolve only after commit. If the backend can't reach the ledger, throw `LedgerUnavailableError` (never return `null` for a connection failure).
- Events are append-only. No update, no delete.

### LocalLedger (Phase 4)

Postgres table `LedgerEntry`, hash-chained:

```text
entryHash = SHA256( prevHash + canonicalJson({type, subjectId, payload, at}) )
```

`verifyChain()` walks entries in order and recomputes each hash. Any edited row breaks every later hash. Genesis entry uses `prevHash = "0".repeat(64)`. Canonical JSON means keys sorted alphabetically so the same data always hashes the same.

Writes run inside a serializable transaction so two concurrent writes can't take the same `prevHash`.

**Honest limit:** one Postgres owner can rewrite the whole chain. That's exactly why Fabric exists, and it's the comparison the PRD wants in the final report.

### FabricLedger (Phase 5)

Same interface, backed by `@hyperledger/fabric-gateway` and chaincode functions: `registerIssuer`, `updateIssuerStatus`, `registerIssuerKey`, `issueCertificate`, `getCertificate`, `revokeCertificate`, `getCertificateHistory`. Chaincode enforces the same rules as above, checking the caller's MSP identity against the issuer.

## 7. What gets signed

**Decision:** sign the exact PDF bytes. Don't sign a hash.

```ts
// packages/crypto/src/index.ts
import { createHash, createSign, createVerify, constants } from "node:crypto";

const pss = {
  padding: constants.RSA_PKCS1_PSS_PADDING,
  saltLength: constants.RSA_PSS_SALTLEN_DIGEST,
};

export const sha256 = (data: Buffer) =>
  createHash("sha256").update(data).digest("hex");

export const sign = (data: Buffer, privateKeyPem: string) =>
  createSign("sha256").update(data).sign({ key: privateKeyPem, ...pss }, "base64");

export const verify = (data: Buffer, signature: string, publicKeyPem: string) =>
  createVerify("sha256").update(data).verify({ key: publicKeyPem, ...pss }, signature, "base64");
```

`createSign("sha256")` already hashes internally, so passing it a pre-hash would hash twice. The separate `sha256()` result is stored on the ledger as the quick "did the file change" check.

Key size: RSA 2048 minimum, 3072 for anything beyond the demo.

## 8. Flows

### Issue

```text
1. authenticate + role = ISSUER (middleware)
2. zod-validate body
3. generate certificateId (CERT- + 6 random hex, retry on collision)
4. create Certificate row, status PENDING
5. render PDF with ID + QR (QR encodes {BASE_URL}/verify/{id})
6. documentHash = sha256(pdfBytes)
7. signature = sign(pdfBytes, institution private key)
8. ledger.issueCertificate(...)         ← must commit
9. on success: status ISSUED, store txId, write CertificateEvent + AuditLog
   on failure: status FAILED, never show as issued
10. holder gets the PDF + link
```

The PDF is final before hashing. Embed the ID and QR first, hash last.

### Verify

Order matters. Cheap and decisive checks first:

```text
1. ledger.getCertificate(id)            → null          → NOT_FOUND
2. ledger.getIssuer(record.issuerId)    → missing/disabled → ISSUER_UNTRUSTED
3. public key for record.keyId          → missing, or status COMPROMISED → ISSUER_UNTRUSTED
4. sha256(upload) === record.documentHash? else → DOCUMENT_MISMATCH
5. verify(upload, record.signature, publicKey)  else → SIGNATURE_INVALID
6. record.status === REVOKED            → REVOKED
7. expiresAt in the past                → EXPIRED
8. otherwise                            → VALID
Any LedgerUnavailableError at any step  → UNAVAILABLE
```

- Public key always comes from the registry, never from the PDF.
- `RETIRED` keys still verify old certificates. `COMPROMISED` keys don't, and affected certificates get flagged.
- Verify by ID only (no upload) runs steps 1, 2, 3, 6, 7 and reports "file not checked".
- The response includes every check with pass/fail/skipped, not just the final state.
- Hash upload through a stream so large files don't sit in memory.

### Revoke

```text
1. authenticate + role = ISSUER or INSTITUTION_ADMIN
2. certificate belongs to caller's institution
3. status must be ISSUED
4. ledger.revokeCertificate(id, reasonCode, actorId)  ← must commit
5. on success: status REVOKED, CertificateEvent + AuditLog
   on failure: status unchanged, return error
```

## 9. API

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/login` | public | Get JWT |
| POST | `/api/institutions` | NETWORK_ADMIN | Register institution |
| GET | `/api/institutions` | any auth | List visible institutions |
| PATCH | `/api/institutions/:id/status` | NETWORK_ADMIN | Enable/disable |
| POST | `/api/keys/register` | INSTITUTION_ADMIN | Register public key |
| PATCH | `/api/keys/:keyId/status` | INSTITUTION_ADMIN | Retire/compromise |
| POST | `/api/certificates` | ISSUER | Create and issue |
| GET | `/api/certificates` | ISSUER, HOLDER | List (scoped to caller) |
| GET | `/api/certificates/:id` | scoped | Metadata |
| GET | `/api/certificates/:id/file` | scoped | Download PDF |
| POST | `/api/certificates/:id/verify` | public, rate-limited | Verify (file optional) |
| POST | `/api/certificates/:id/revoke` | ISSUER, INST_ADMIN | Revoke |
| GET | `/api/certificates/:id/history` | scoped | Lifecycle events |
| GET | `/api/ledger/transactions` | AUDITOR, admins | Explorer feed |
| GET | `/api/ledger/verify-chain` | AUDITOR, admins | Recheck the local chain |

Error shape everywhere: `{ "error": { "code": "STRING_CODE", "message": "Human text" } }`.

## 10. Configuration

`.env.example` (never commit `.env`):

```text
DATABASE_URL=
JWT_SECRET=
BASE_URL=http://localhost:5173
KEYS_DIR=./keys
STORAGE_DIR=./storage
LEDGER_DRIVER=local        # local | fabric
FABRIC_* (Phase 5)
```

## 11. Number Theory Lab

`packages/number-theory` exports pure functions: `gcd`, `extendedGcd`, `modInverse`, `totient`, `modExp`, `isPrimeTrial`, `millerRabin`, `toyRsa`. The API exposes them under `/api/lab/*` so the React lab page can show step-by-step output (remainder sequences, Bézout coefficients, squaring table).

Use `BigInt` throughout so inputs beyond 2^53 work.

This package is educational. The production signing path never imports it.
