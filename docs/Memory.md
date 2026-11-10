# Memory

## Session: Commit 6 - Institution and Key Registration

**Date:** 2026-11-10

### Current Phase
Phase 4: Web App Foundation

### What's Done
- Repository initialized with git
- Commit 1: docs (PRD, Architecture, Rules, Phases, Design, Commits.md) + README.md + .gitignore
- Commit 2: monorepo scaffolding (npm workspaces, tooling, docker compose, env example)
- Commit 3-4 (Teammate): Number theory package (gcd, extended gcd, modInverse, totient, modExp, theorem checks) with tests and docs
- Commit 5: Auth foundation (Prisma schema, seed data, JWT auth, RBAC middleware, audit log)
- Commit 6 (this commit): Institution and signing key registration
  - POST /api/institutions (NETWORK_ADMIN only) - create institution
  - GET /api/institutions - list institutions (any authenticated)
  - GET /api/institutions/:id - get institution with keys (any authenticated)
  - PATCH /api/institutions/:id/status (NETWORK_ADMIN only) - enable/disable institution
  - POST /api/keys/register (INSTITUTION_ADMIN only, scoped to own institution) - register public key
  - GET /api/keys - list keys (INSTITUTION_ADMIN scoped, NETWORK_ADMIN all)
  - GET /api/keys/:keyId - get key details (with access control)
  - PATCH /api/keys/:keyId/status (INSTITUTION_ADMIN only, scoped to own institution) - update key status (ACTIVE/RETIRED/COMPROMISED)
  - Role checks on every route (401/403/409 tests)
  - 25 integration tests covering all endpoints and error cases

### Decisions Made
- Institution registration restricted to NETWORK_ADMIN
- Key registration restricted to INSTITUTION_ADMIN for their own institution
- Key status updates restricted to INSTITUTION_ADMIN for their own institution's keys
- Middleware `requireInstitutionAccess` checks institutionId from body/params/query against user's institutionId
- Route handlers also verify key ownership for key-specific operations
- Disabled institutions cannot register new keys
- Duplicate key IDs return 409 CONFLICT
- Non-existent institutions return 404 (for status change) or 403 (for key registration via middleware)

### Next Task
Commit 7 (Teammate): feat(number-theory): add primality tests, toy rsa and lab api endpoints

### Known Bugs / Open Questions
- None

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

# Build API
npm run build --workspace=apps/api
```