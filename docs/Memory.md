# Memory

## Session: Commit 14 - End-to-End Demo and Performance Measurements

**Date:** 2026-11-17

### Current Phase
Phase 7: Evaluation and Report

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
- Commit 11: Certificate issuance with ledger commit
- Commit 12 (Teammate): Verification service and revocation
- Commit 13 (Sharanyo): Web app frontend (login, issue, verify, admin, keys, holder, explorer, lab)
- **Commit 14 (this commit): test: add end-to-end demo scenario and performance measurements**
  - `apps/api/scripts/e2e-demo.ts` - 10-step demo test from Phases.md:
    1. Register two fictional universities
    2. Register public signing keys
    3. Issue certificate as University A
    4. Show PDF, ID, QR, hash, signature info
    5. Show ledger entry / transaction
    6. Verify original PDF: VALID
    7. Tamper PDF (flip one byte): DOCUMENT_MISMATCH
    8. Revoke certificate
    9. Verify again: REVOKED
    10. Number Theory Lab: reproduce toy RSA example (p=61, q=53, e=17, d=2753, 65^2753=588, 588^17=65)
  - `apps/api/scripts/performance.ts` - Performance measurements (25 runs each):
    - SHA-256 hashing
    - RSA-PSS signing
    - RSA-PSS verification
    - Ledger lookup
    - Total verify (end-to-end)
    - Records median, p95, mean, min, max
    - Captures machine specs (CPU, memory, OS, Node.js version)
  - `docs/performance.md` - Performance report with table and analysis
  - `docs/report-crypto-math.md` - Cryptography and mathematics sections for final report
    - Mathematical foundations (modular arithmetic, GCD, extended GCD, modular inverse, totient, modExp, primality)
    - Toy RSA and why it's insecure (deterministic, malleable, no padding)
    - Production crypto: SHA-256, RSA 2048, RSA-PSS with salt length = digest length
    - Why we sign PDF bytes (not pre-hash): createSign hashes internally
    - Ledger hash chaining and tamper detection
    - Honest limit: one Postgres owner can rewrite chain
    - Verification check order and rationale
    - Key status semantics (ACTIVE/RETIRED/COMPROMISED)
    - Security properties summary

### Decisions Made
- E2E test runs against actual API services (not mocks) using the same LocalLedger and crypto
- Performance script uses 25 runs (exceeds 20+ requirement) with warm-up
- Machine specs captured programmatically via `os` module
- Performance report written to `docs/performance.md` with markdown table
- Crypto/math report written to `docs/report-crypto-math.md` in developer's own words
- Toy RSA example exactly reproduces textbook values (p=61, q=53, e=17, d=2753)

### Next Task
Commit 15 (Sharanyo): docs: add setup guide, security review and final report

### Known Bugs / Open Questions
- E2E and performance tests require PostgreSQL running (docker compose up)
- bcrypt native module may need rebuild on some machines

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

# Run end-to-end demo test
npm run test:e2e --workspace=apps/api

# Run performance measurements
npm run test:perf --workspace=apps/api

# Run all tests
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