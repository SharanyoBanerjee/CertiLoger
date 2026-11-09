# Memory

## Session: Commit 2 - Monorepo Scaffold

**Date:** 2026-11-09

### Current Phase
Phase 0: Foundation

### What's Done
- Repository initialized with git
- Commit 1: docs (PRD, Architecture, Rules, Phases, Design, Commits.md) + README.md + .gitignore
- Commit 2 (this commit): monorepo scaffolding
  - npm workspaces: apps/web, apps/api, packages/number-theory, packages/crypto, packages/ledger
  - Root tooling: TypeScript (strict), ESLint, Prettier, Vitest
  - Docker Compose for PostgreSQL
  - .env.example
  - docs/Memory.md created

### Decisions Made
- npm workspaces over pnpm/yarn for simplicity (standard npm, no extra tool)
- TypeScript project references via paths in root tsconfig
- Local Postgres via Docker Compose, no external dependencies
- Vite + React + TypeScript + Tailwind for web
- Express + TypeScript for API
- All packages are pure TypeScript, no external deps except test utils

### Next Task
Commit 3 (Teammate): feat(number-theory): add gcd, extended gcd and modular inverse

### Known Bugs / Open Questions
- None yet

### Commands
```bash
# Install dependencies
npm install

# Start Postgres
docker compose up -d

# Run tests (all workspaces)
npm test

# Lint
npm run lint

# Format
npm run format
```