# CertiLedger: Rules

These rules apply to any AI tool or human writing code in this repo. If a request conflicts with a rule, say so and stop. Don't quietly work around it.

## 1. Before you write anything

1. Read `docs/Memory.md` first (once it exists). Don't re-read the whole codebase.
2. Read `docs/Phases.md` and work on the **current phase only**.
3. Check `docs/Architecture.md` for where code belongs.
4. One logical change per task. If it's two changes, it's two commits.

## 2. Hard security rules (never break)

1. Private keys never go in frontend code, git, logs, API responses, or error messages.
2. `keys/`, `storage/`, `.env` are gitignored. Check `.gitignore` before the first commit.
3. Never put PDFs, names, grades, addresses, or ID numbers on the ledger.
4. Never implement RSA, SHA-256, or padding by hand for the real workflow. Use `node:crypto`.
5. Never import `packages/number-theory` from the signing or verify path. Toy RSA is for the lab only.
6. Use RSA-PSS, never PKCS#1 v1.5 signing and never raw textbook RSA.
7. Every protected route needs auth middleware **and** a role check. Frontend hiding a button isn't security.
8. Verification never returns `VALID` when any check failed or couldn't run.
9. A ledger failure returns `UNAVAILABLE`, not `VALID`, not `INVALID`.
10. Don't mark a certificate `ISSUED` or `REVOKED` until the ledger commit succeeds.
11. Public key for verification comes from the registry, never from the uploaded PDF.
12. Don't put personal data in URLs, QR codes, logs, or analytics. The QR holds the certificate ID URL only.

## 3. Libraries

**Use**

| Need | Library |
|---|---|
| HTTP | `express` |
| Validation | `zod` |
| ORM | `prisma` |
| Passwords | `bcrypt` |
| Tokens | `jsonwebtoken` |
| Upload | `multer` |
| PDF | `pdf-lib` |
| QR | `qrcode` |
| Crypto | `node:crypto` |
| Tests | `vitest`, `supertest` |
| Fabric (Phase 5) | `@hyperledger/fabric-gateway` |

**Avoid**

- Any "crypto helper" npm package wrapping RSA. `node:crypto` is enough.
- `crypto-js`, `node-rsa`, `jsrsasign` (extra attack surface, no benefit here).
- Heavy frameworks (NestJS, GraphQL, Redux) unless a phase explicitly needs one.
- `localStorage` for JWTs if an `httpOnly` cookie is workable. If you use `localStorage`, note the XSS tradeoff in docs.
- Anything unmaintained or with no release in 2+ years.

Adding a new dependency needs a one-line reason in the commit message.

## 4. Code style

- TypeScript, `strict: true`. No `any` without a comment explaining why.
- Simplest thing that works. No abstractions until there are two real uses.
- Short, plain names (`cert`, `hash`, `sig`, `keyId`). No clever one-liners.
- Small functions. If it needs a comment to explain what, split it. Comments explain why.
- `const` by default. Named exports. No default exports except React pages.
- Business logic in `services/`, not in route handlers. Routes parse, call a service, respond.
- Async/await only. No unhandled promises.
- Files stay under ~200 lines. Split when they grow past that.
- Formatting: Prettier. Lint: ESLint. Both run before every commit.

## 5. Error handling

1. Validate all input with `zod` at the route boundary. Reject early with `400`.
2. Throw typed errors (`AppError(code, status, message)`). One error middleware turns them into the standard response:

```json
{ "error": { "code": "CERT_NOT_FOUND", "message": "No matching certificate was found." } }
```

3. Never leak stack traces, file paths, SQL, or key material to clients.
4. Log the real error server-side with a request ID. Never log keys, passwords, tokens, or full PDFs.
5. Ledger connection failure → `LedgerUnavailableError` → `UNAVAILABLE`.
6. If issuing fails after the DB row exists, mark `FAILED`. Don't delete and don't leave `PENDING` forever.
7. Status codes: 400 bad input, 401 not logged in, 403 wrong role, 404 not found, 409 duplicate or invalid state transition, 503 ledger unavailable.

## 6. Testing

- Every feature ships with tests in the same commit, or the commit right after.
- Number Theory: use the PRD test table (MT-01 to MT-10) as the base. Add edge cases (`modExp` exponent 0, `modInverse` when gcd ≠ 1, negative inputs, `BigInt` large values).
- API: cover the system tests (ST-01 to ST-15) over time.
- A bug fix starts with a failing test.
- Don't mock the crypto package in crypto tests. Use a real generated test keypair.
- Test keys are generated at test time, never committed.

## 7. Git and commits

- Conventional Commits: `feat(scope): ...`, `fix`, `test`, `docs`, `refactor`, `chore`.
- One logical change per commit. Message says what and why, in under 72 characters on the first line.
- Each feature commit includes code + tests + docs (or the docs commit follows immediately).
- Branches: `main` stays working. Work on `phase-N/short-name`, merge when the phase checklist passes.
- Never commit `.env`, `keys/`, `storage/`, or `node_modules/`.

## 8. Documentation per feature

For every meaningful feature, add or update:

1. **What it does** (2-3 sentences).
2. **How the code works** (walk through the key function).
3. **The logic or math** where it applies (Bézout identity for modular inverse, why repeated squaring is O(log e)).
4. **How to run and test it.**

Explanations should be good enough that either teammate can defend the code in viva without looking at it.

## 9. What the AI should do

- Ask before adding a dependency, changing the schema, or changing an API shape.
- Point out a security problem even if nobody asked.
- Say "I'm not sure" when unsure. Don't invent library APIs. Check the docs.
- Update `docs/Memory.md` at the end of every working session.
- Keep answers short and show code in code blocks.

## 10. What the AI should not do

- Build ahead of the current phase.
- Rewrite working files for style.
- Add features not in the PRD (no tokens, no payments, no mining).
- Claim government integration, legal validity, or production readiness anywhere (code comments, UI text, docs).
- Weaken a check to make a test pass.
- Hardcode secrets, even "temporary" ones.
- Swallow errors with empty `catch` blocks.
- Use BFS, DFS, heaps, or backtracking unless a real requirement needs them.

## 11. UI text rules

- Use the exact outcome names (`VALID`, `REVOKED`...) in code, plain sentences for users.
- Always show which checks passed and which failed.
- The prototype banner ("Academic prototype, fictional data") shows on every page.
