# Memory

## Session: Commit 7 - Number Theory: Primality Tests, Toy RSA, Lab API Endpoints

**Date:** 2026-11-11

### Current Phase
Phase 1: Number Theory Lab (continuing)

### What's Done
- Repository initialized with git
- Commit 1: docs (PRD, Architecture, Rules, Phases, Design, Commits.md) + README.md + .gitignore
- Commit 2: monorepo scaffolding (npm workspaces, tooling, docker compose, env example)
- Commit 3-4 (Teammate): Number theory package (gcd, extended gcd, modInverse, totient, modExp, theorem checks) with tests and docs
- Commit 5: Auth foundation (Prisma schema, seed data, JWT auth, RBAC middleware, audit log)
- Commit 6 (Sharanyo): Institution and signing key registration
- **Commit 7 (this commit): Number Theory - Primality Tests, Toy RSA, Lab API Endpoints**
  - `isPrimeTrial(n)` - trial division primality test with step table
  - `millerRabin(n, rounds?)` - probabilistic primality test with configurable rounds, error probability 4^(-rounds), catches Carmichael numbers (e.g., 561)
  - `toyRsaGenerate(p, q, e)` - generates toy RSA keys (n, φ, e, d) with validation
  - `toyRsaSign(m, d, n)` - textbook RSA signing (m^d mod n)
  - `toyRsaVerify(s, e, n)` - textbook RSA verification (s^e mod n)
  - Reproduces textbook example: p=61, q=53, e=17, d=2753, 65^2753 mod 3233 = 588, 588^17 mod 3233 = 65
  - Express routes under /api/lab/* for all number theory functions (gcd, extended-gcd, mod-inverse, totient, mod-exp, is-prime, miller-rabin, toy-rsa)
  - All BigInt values returned as strings in JSON
  - Zod-validated inputs
  - 25 new tests covering all functions including Carmichael number 561
  - Documentation: docs/number-theory/toy-rsa.md explaining why textbook RSA is insecure and why production uses RSA-PSS

### Decisions Made
- Trial division is O(√n), suitable for educational purposes only
- Miller-Rabin default 20 rounds (error probability ≤ 2⁻⁴⁰)
- Toy RSA is explicitly educational - never imports into production crypto path
- Lab API endpoints are thin wrappers around number-theory functions
- BigInt serialized as strings in JSON to avoid precision loss

### Next Task
Commit 9 (Sharanyo): feat(pdf): add certificate template rendering and qr generation

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