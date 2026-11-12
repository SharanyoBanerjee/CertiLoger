# Memory

## Session: Commit 9 - PDF Template Rendering and QR Generation

**Date:** 2026-11-12

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
- **Commit 9 (this commit): PDF Template Rendering and QR Generation**
  - PDF certificate generation using pdf-lib (A4, 20mm margins, Source Serif 4 font)
  - QR code generation with qrcode library encoding verification URL
  - Certificate template with institution name, holder name, qualification, grade, date
  - Certificate ID and verification URL displayed
  - POST /api/certificates endpoint for issuers to generate certificates
  - PDF returned as downloadable attachment
  - Frontend pages: Landing, Login, Verify, Dashboard, Issue, Certificates, Keys, Institutions, Ledger, Lab
  - Auth layout with role-based navigation
  - React components: Button, Input, Select, Textarea, Card, Badge, Table, Modal, PrototypeBanner
  - Auth provider with JWT token management
  - API client with all endpoints
  - Number Theory Lab page with all algorithms
  - Complete UI implementation per Design.md specifications

### Decisions Made
- pdf-lib for PDF generation (no headless browser needed)
- qrcode library for QR code generation
- Certificate template matches Design.md section 8 exactly
- QR code encodes `{BASE_URL}/verify/{certificateId}` only
- PDF is final before any hashing/signing (per Architecture.md)
- Frontend uses Vite + React + TypeScript + Tailwind
- Role-based navigation in AuthLayout
- Mock data used for frontend development (real API integration pending)

### Next Task
Commit 10 (Teammate): feat(ledger): add ledger interface and hash-chained local ledger

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

# Build all
npm run build

# Run API dev server
npm run dev --workspace=apps/api

# Run Web dev server
npm run dev --workspace=apps/web
```