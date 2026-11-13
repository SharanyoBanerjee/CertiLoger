# Memory

## Session: Commit 10 - Hash-Chained Local Ledger

**Date:** 2026-11-13

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
- **Commit 10 (this commit): feat(ledger): add ledger interface and hash-chained local ledger**
  - `packages/ledger/src/index.ts` - LedgerService interface and types (LedgerCertificate, LedgerIssuer, LedgerEvent, TxResult, LedgerUnavailableError)
  - `packages/ledger/src/localLedger.ts` - LocalLedger implementation with hash-chained entries
    - SHA-256 via node:crypto (no dependency on crypto package)
    - Canonical JSON with sorted keys for deterministic hashing
    - Genesis entry uses `prevHash = "0".repeat(64)`
    - Entry hash = SHA256(prevHash + canonicalJson({type, subjectId, payload, at}))
    - Serializable transactions for concurrent write safety
    - All LedgerService methods implemented:
      - registerIssuer, setIssuerStatus, registerIssuerKey, setKeyStatus
      - issueCertificate (rejects unknown/disabled issuer, duplicate ID)
      - revokeCertificate (rejects unknown/already revoked)
      - getCertificate, getIssuer, getHistory, verifyChain
  - `packages/ledger/src/localLedger.test.ts` - 33 comprehensive tests
  - `docs/ledger.md` - Documentation explaining chaining, tampering detection, honest limit

### Decisions Made
- SHA-256 implemented directly in localLedger.ts using node:crypto (no workspace:* dependency issues)
- Prisma Client added as dependency to ledger package
- Serializable isolation level for all write transactions
- Canonical JSON sorts keys alphabetically at all nesting levels
- verifyChain() returns `{ valid: boolean, firstBrokenIndex?: number }`
- getHistory() returns events in chronological order (seq ascending)
- "Honest limit" documented: one Postgres owner can rewrite entire chain

### Next Task
Commit 11 (Sharanyo): feat(certificates): add certificate issuance with ledger commit

### Known Bugs / Open Questions
- Tests require PostgreSQL database (not available locally - needs docker compose up)
- bcrypt native module missing for API tests

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