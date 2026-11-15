# Memory

## Session: Commit 12 - Verification Service and Revocation

**Date:** 2026-11-15

### Current Phase
Phase 4: Web App Foundation

### What's Done
- Repository initialized with git
- Commit 1: docs (PRD, Architecture, Rules, Phases, Design, Commits.md) + README.md + .gitignore
- Commit 2: monorepo scaffolding (npm workspaces, tooling, docker compose, env example)
- Commit 3-4 (Teammate): Number theory package (gcd, extended gcd, modInverse, totient, modExp, theorem checks) with tests and docs
- Commit 5: Auth foundation (Prisma schema, seed data, JWT auth, RBAC middleware, audit log)
- Commit 6: Institution and signing key registration
- Commit 7 (Teammate): Number Theory - Primality Tests, Toy RSA, Lab API Endpoints
- Commit 8 (Teammate): Crypto - SHA-256, RSA-PSS sign/verify, key generation
- Commit 9: PDF Template Rendering and QR Generation
- Commit 10 (Teammate): Hash-Chained Local Ledger
- Commit 11: Certificate issuance with ledger commit (implemented as part of this commit)
- **Commit 12 (this commit): feat(verify): add verification service and revocation**
  - `apps/api/src/services/verification.ts` - Verification service with exact check order from Architecture.md section 8
    - 7 verification checks in order: LEDGER_LOOKUP, ISSUER_STATUS, KEY_STATUS, DOCUMENT_HASH, SIGNATURE, REVOCATION_STATUS, EXPIRY
    - Returns detailed check results (pass/fail/skipped + reason) + overall state
    - Handles LedgerUnavailableError → UNAVAILABLE
    - RETIRED keys still verify, COMPROMISED keys don't
    - Public key always from registry, never from PDF
    - Verify by ID only (no file) returns FILE_NOT_CHECKED
  - `apps/api/src/services/certificate.ts` - Certificate service (issuance flow from Commit 11)
    - Full issuance: generate ID, create PENDING row, generate PDF, hash, sign, ledger commit, update to ISSUED/FAILED
    - CertificateEvent + AuditLog on success/failure
    - getCertificate, listCertificates, downloadCertificatePDF
  - `apps/api/src/routes/certificates.ts` - Updated with full REST API
    - POST /api/certificates (issue with ledger commit)
    - GET /api/certificates (list scoped)
    - GET /api/certificates/:id (metadata)
    - GET /api/certificates/:id/file (download PDF)
    - POST /api/certificates/:id/verify (verify with optional file upload)
    - POST /api/certificates/:id/revoke (revoke with reasonCode)
    - GET /api/certificates/:id/history (ledger + DB events)
  - `docs/verification.md` - Documentation with decision table and check order rationale

### Decisions Made
- Verification check order follows Architecture.md section 8 exactly (cheap/decisive first)
- Every check returned in response, not just final state
- RETIRED keys still verify old certificates; COMPROMISED keys fail all verifications
- LedgerUnavailableError at any step → UNAVAILABLE
- Public key for verification comes from registry (Prisma), never from uploaded PDF
- Certificate issuance implements full flow: PENDING → PDF → hash → sign → ledger → ISSUED/FAILED
- Used node:crypto directly in services (sha256, sign, verify, loadPrivateKey) to avoid workspace dependency issues
- Multer for PDF upload (memory storage, 10MB limit, PDF only)

### Next Task
Commit 13 (Sharanyo): feat(web): add login, issue, verify, admin, keys, holder, explorer and lab pages

### Known Bugs / Open Questions
- Tests require PostgreSQL database (not available locally - needs docker compose up)
- bcrypt native module missing for API tests
- Lab route uses @certiledger/number-theory as file: dependency

### Commands
```bash
# Install dependencies
npm install

# Start Postgres
docker compose up -d

# Generate Prisma client
npm run db:generate --workspace=apps/api

# Run migrations
npm run db:migrate --workspace=apps/api

# Seed database
npm run db:seed --workspace=apps/api

# Run tests (all workspaces)
npm test

# Lint
npm run lint

# Format
npm run format

# Build all
npm run build

# Run API dev server
npm run dev --workspace=apps/api

# Run Web dev server
npm run dev --workspace=apps/web
```