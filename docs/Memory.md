# Memory

## Session: Commit 5 - Auth Foundation

**Date:** 2026-11-09

### Current Phase
Phase 4: Web App Foundation (Auth tasks)

### What's Done
- Repository initialized with git
- Commit 1: docs (PRD, Architecture, Rules, Phases, Design, Commits.md) + README.md + .gitignore
- Commit 2: monorepo scaffolding (npm workspaces, tooling, docker compose, env example)
- Commit 3-4 (Teammate): Number theory package (gcd, extended gcd, modInverse, totient, modExp, theorem checks) with tests and docs
- Commit 5 (this commit): Auth foundation
  - Full Prisma schema (Institution, User, IssuerKey, Certificate, CertificateEvent, AuditLog, LedgerEntry)
  - Seed data: 2 fictional institutions, 7 users (one per role + extras)
  - POST /api/auth/login with JWT access + refresh tokens
  - requireAuth middleware
  - requireRole middleware (NETWORK_ADMIN, INSTITUTION_ADMIN, ISSUER, HOLDER, AUDITOR)
  - requireInstitutionAccess middleware
  - zod validation middleware
  - Error handling with typed errors (AppError, UnauthorizedError, ForbiddenError, NotFoundError, ConflictError, ValidationError, LedgerUnavailableError)
  - Audit log helper (writeAuditLog, getAuditLogs)
  - Standard error response shape: `{ "error": { "code": "STRING_CODE", "message": "Human text" } }`

### Decisions Made
- Prisma schema matches Architecture.md section 5 exactly
- JWT tokens: 15min access, 7day refresh
- bcrypt for password hashing (cost 10)
- Role enum: NETWORK_ADMIN, INSTITUTION_ADMIN, ISSUER, HOLDER, AUDITOR
- KeyStatus enum: ACTIVE, RETIRED, COMPROMISED
- CertStatus enum: PENDING, ISSUED, REVOKED, FAILED
- Error middleware catches ZodError and converts to ValidationError
- Audit logs written for login actions

### Next Task
Commit 6: feat(institutions): add institution and signing key registration

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