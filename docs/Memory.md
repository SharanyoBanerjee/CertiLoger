# Memory

## Session: Commit 11 - Certificate Issuance with Ledger Commit

**Date:** 2026-11-14

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
- Commit 10 (Teammate): Ledger interface and hash-chained local ledger (LocalLedger)
- **Commit 11 (this commit): Certificate Issuance with Ledger Commit**
  - POST /api/certificates endpoint with full issuance flow:
    1. Validate input (zod)
    2. Check caller has access to institution
    3. Get institution's active signing key
    4. Generate certificate ID
    5. Create certificate record with PENDING status
    6. Render PDF with certificate ID and QR code
    7. Hash PDF bytes (SHA-256 from crypto package)
    8. Sign PDF bytes with institution's private key (RSA-PSS from crypto package)
    9. Commit to ledger (LocalLedger.issueCertificate)
    10. On success: update certificate to ISSUED with documentHash, keyId, txId
    11. On failure: mark certificate as FAILED
    12. Return PDF as downloadable attachment
  - Private keys read from KEYS_DIR on server only
  - Certificate events and audit logs written
  - Role checks on every route (ISSUER only)

### Decisions Made
- Full issuance flow implements Architecture.md section 8 exactly
- PDF rendered before hashing (ID and QR embedded first)
- SHA-256 and RSA-PSS from @certiledger/crypto package (node:crypto)
- Private keys loaded from KEYS_DIR/{keyId}.pem on server only
- Ledger commit happens before marking ISSUED (never mark ISSUED before ledger commit)
- FAILED status on any failure after PENDING
- Certificate events and audit logs for traceability

### Next Task
Commit 12 (Teammate): feat(verify): add verification service and revocation

### Known Bugs / Open Questions
- Ledger package test failure in commit 10 (teammate's test expects "Unknown or disabled issuer" but gets "No genesis entry found" when no genesis entry exists) - this is in teammate's commit 10

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