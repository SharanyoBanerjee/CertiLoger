# Memory

## Session: Commit 13 - Web Pages Integration

**Date:** 2026-11-16

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
- Commit 11: Certificate Issuance with Ledger Commit
- Commit 12 (Teammate): Verification service and revocation
- **Commit 13 (this commit): Web Pages Integration**
  - Integrated all 10 web pages with real API endpoints:
    - Landing page (`/`) - Public landing with verify/login links
    - Login page (`/login`) - JWT authentication with role-based redirect
    - Verify page (`/verify`) - Public verification by ID or PDF upload, shows check-by-check results
    - Dashboard (`/dashboard`) - Role-based stats and quick actions
    - Issue page (`/issue`) - Certificate issuance form with PDF download
    - Certificates page (`/certificates`) - Searchable/filterable list with detail modal
    - Keys page (`/keys`) - Register/view/update signing keys
    - Institutions page (`/institutions`) - NETWORK_ADMIN can register/disable institutions
    - Ledger page (`/ledger`) - Hash-chained ledger explorer with chain verification
    - Lab page (`/lab`) - All 12 number theory algorithms with step-by-step output
  - AuthProvider with JWT token management (access + refresh tokens)
  - AuthLayout with role-based navigation and PrototypeBanner
  - UI component library: Button, Input, Select, Textarea, Card, Badge, Table, Modal
  - API client with all endpoints (auth, institutions, keys, certificates, lab)
  - PrototypeBanner on every page
  - All pages integrated with real API endpoints (verified by build)

### Decisions Made
- All 10 pages already implemented in commit 9, integrated with real API in this commit
- Verify page uses real `/api/certificates/:id/verify` endpoint with file upload
- Certificate issuance uses real `/api/certificates` endpoint with PDF download
- All pages use AuthProvider for JWT auth and role-based access
- Role-based navigation in AuthLayout (NETWORK_ADMIN, INSTITUTION_ADMIN, ISSUER, HOLDER, AUDITOR)
- Verification page uses real API with proper error handling and check-by-check display
- Check labels mapped from API codes (LEDGER_LOOKUP → "Certificate found on ledger", etc.)

### Next Task
Commit 14 (Teammate): test: add end-to-end demo scenario and performance measurements

### Known Bugs / Open Questions
- Ledger package test failure in commit 10 (teammate's test expects "Unknown or disabled issuer" but gets "No genesis entry found" when no genesis entry exists) - this is in teammate's commit 10
- The verify page shows "FILE_NOT_CHECKED" when no PDF uploaded - expected behavior

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