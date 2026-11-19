# CertiLedger Setup Guide

> Academic prototype. Fictional institutions, synthetic data. No legal recognition, no real government integration, not production ready.

---

## Prerequisites

- **Node.js 20+** (LTS recommended)
- **Docker** (for PostgreSQL)
- **Git**

---

## Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/SharanyoBanerjee/CertiLoger
cd CertiLoger
npm install
```

### 2. Start PostgreSQL

```bash
docker compose up -d
```

This starts PostgreSQL 16 on port 5432 with:
- Database: `certiledger`
- User: `certiledger`
- Password: `certiledger`

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```env
DATABASE_URL="postgresql://certiledger:certiledger@localhost:5432/certiledger"
JWT_SECRET="your-super-secret-jwt-key-min-32-chars"
BASE_URL="http://localhost:5173"
KEYS_DIR="./keys"
STORAGE_DIR="./storage"
LEDGER_DRIVER="local"
PORT=3000
NODE_ENV="development"
```

**Required:** Generate a strong `JWT_SECRET` (min 32 characters):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Database Setup

```bash
# Generate Prisma client
npm run db:generate --workspace=apps/api

# Run migrations
npm run db:migrate --workspace=apps/api

# Seed database (2 institutions, 7 users)
npm run db:seed --workspace=apps/api
```

### 5. Generate Private Keys

Each institution needs a private key in `KEYS_DIR` for signing certificates:

```bash
mkdir -p keys

# For INST-001 (University of CertiLedger)
openssl genrsa -out keys/INST-001-KEY-01.pem 2048
openssl rsa -in keys/INST-001-KEY-01.pem -pubout -out keys/INST-001-KEY-01.pub

# For INST-002 (CertiLedger Institute of Technology)
openssl genrsa -out keys/INST-002-KEY-01.pem 2048
openssl rsa -in keys/INST-002-KEY-01.pem -pubout -out keys/INST-002-KEY-01.pub
```

**Important:** The private key file must be named exactly `{keyId}.pem` (e.g., `INST-001-KEY-01.pem`) and placed in `KEYS_DIR`.

### 6. Run Development Servers

**Terminal 1 - API:**
```bash
npm run dev --workspace=apps/api
# API at http://localhost:3000
```

**Terminal 2 - Web:**
```bash
npm run dev --workspace=apps/web
# Web at http://localhost:5173
```

---

## Test Users (Seeded)

All passwords: `password123`

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

## Verification Steps

### 1. Issue a Certificate

1. Open http://localhost:5173/login
2. Login as `issuer@univ.test` / `password123`
3. Navigate to **Issue** page
4. Fill form and submit
5. PDF downloads automatically

### 2. Verify the Certificate

1. Open http://localhost:5173/verify
2. Enter Certificate ID (or upload PDF)
3. Click **Verify by ID** or **Verify with PDF**
4. See check-by-check results

### 3. Revoke a Certificate

1. Login as issuer
2. Go to **Certificates** page
3. Click **Revoke** on an issued certificate
4. Enter reason code
5. Verify again → shows `REVOKED`

---

## Common Commands

```bash
# Run all tests
npm test

# Lint code
npm run lint

# Format code
npm run format

# Build all packages
npm run build

# Database studio (view/edit data)
npm run db:studio --workspace=apps/api

# Reset database (careful!)
npm run db:migrate reset --workspace=apps/api
npm run db:seed --workspace=apps/api
```

---

## Troubleshooting

### Database Connection Failed

```bash
# Check Docker is running
docker ps

# Check PostgreSQL logs
docker logs certiledger-postgres

# Restart PostgreSQL
docker compose restart
```

### Migration Fails

```bash
# Reset and retry
npm run db:migrate reset --workspace=apps/api
npm run db:migrate --workspace=apps/api
```

### Private Key Not Found

```
Error: ENOENT: no such file or directory, open './keys/INST-001-KEY-01.pem'
```

**Fix:** Ensure private key exists at `keys/{keyId}.pem` and keyId matches what's registered in the database.

### JWT Secret Too Short

```
Error: JWT_SECRET must be at least 32 characters
```

**Fix:** Generate a proper secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Port Already in Use

```
Error: listen EADDRINUSE: address already in use :::3000
```

**Fix:** Kill existing process or change PORT in `.env`:
```bash
lsof -ti :3000 | xargs kill -9
```

---

## Project Structure

```
certiledger/
├── apps/
│   ├── web/          # React frontend (Vite + React + TS + Tailwind)
│   └── api/          # Express backend
├── packages/
│   ├── number-theory/   # Educational algorithms (GCD, modExp, etc.)
│   ├── crypto/          # SHA-256, RSA-PSS (wraps node:crypto)
│   └── ledger/          # LedgerService + LocalLedger
├── prisma/
│   └── schema.prisma    # Database schema
├── docs/                # Documentation
└── docker-compose.yml   # PostgreSQL
```

---

## Development Workflow

1. **Make changes** in `apps/` or `packages/`
2. **Run tests:** `npm test`
3. **Lint:** `npm run lint`
4. **Format:** `npm run format`
5. **Build:** `npm run build`
6. **Commit:** Follow conventional commits

---

## Key Security Notes

- Private keys never leave the server (stored in `KEYS_DIR`, gitignored)
- `.env`, `keys/`, `storage/` are gitignored
- All protected routes require JWT + role check
- Verification never returns `VALID` on ledger failure → returns `UNAVAILABLE`
- Never marks certificate `ISSUED` before ledger commit succeeds

---

## Limitations (Academic Prototype)

- No legal recognition for participating institutions
- A valid signature doesn't prove claims are true
- Ledger can't stop an authorized but dishonest issuer
- A QR code is a pointer, not security
- A stolen private key can be abused until detected
- Raw-byte hashing rejects a harmlessly re-saved PDF
- Single-node LocalLedger (Postgres owner can rewrite chain)
- No production deployment, no government integration

---

## Further Reading

- `docs/PRD.md` — Product Requirements Document
- `docs/Architecture.md` — Technical architecture decisions
- `docs/Rules.md` — Binding development rules
- `docs/Phases.md` — Development phases & checklist
- `docs/Design.md` — UI/UX design system
- `docs/ARCHITECTURE_OVERVIEW.md` — Detailed architecture & working
- `docs/number-theory/*.md` — Algorithm explanations
- `docs/crypto.md` — What bytes are signed and why
- `docs/ledger.md` — Ledger implementation details
- `docs/report-crypto-math.md` — Crypto & math report sections