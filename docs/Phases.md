# CertiLedger: Phases

Work one phase at a time. A phase is done when its checklist passes, tests are green, and docs are updated. Merge to `main`, then start the next.

**Owners:** **A** = app/integration developer (UI, API integration, DB workflows, ledger integration, docs). **B** = math/backend developer (number theory, crypto, business logic, tests). Both write docs for what they build, and both must be able to explain the whole system.

---

## Phase 0: Foundation

**Owner:** both

**Goal:** repo, tooling, and docs exist before any feature code.

Tasks
- Init monorepo (npm workspaces): `apps/web`, `apps/api`, `packages/*`
- TypeScript, ESLint, Prettier, Vitest configs
- `.gitignore` (`keys/`, `storage/`, `.env`, `node_modules/`), `.env.example`
- Add the five docs to `docs/`
- Docker Compose for Postgres

Commits
```text
chore: init monorepo with workspaces and tooling
chore: add gitignore and env example
docs: add PRD, architecture, rules, phases and design
chore: add docker compose for postgres
```

Done when: `npm install` and `npm test` run clean on a fresh clone.

---

## Phase 1: Number Theory Lab

**Owner:** B (A reviews and writes the UI later)

**Goal:** every algorithm implemented with `BigInt`, tested, explained.

Tasks (one commit per algorithm, with its tests and explainer)
1. Modular arithmetic helper (`mod` that handles negatives)
2. `gcd` (Euclid), returning the remainder steps
3. `extendedGcd` (Bézout coefficients)
4. `modInverse` (null when gcd ≠ 1)
5. `totient` for `p*q` and a general trial-division version
6. `modExp` (repeated squaring)
7. `isPrimeTrial` and `millerRabin`
8. Euler and Fermat theorem checkers (verify `a^φ(n) ≡ 1`)
9. Complexity benchmark (runtime vs input size)

Commits
```text
feat(number-theory): add modular arithmetic helper
feat(number-theory): implement euclidean algorithm
feat(number-theory): implement extended euclidean algorithm
feat(number-theory): add modular inverse calculation
feat(number-theory): add euler totient
feat(number-theory): add fast modular exponentiation
feat(number-theory): add trial division and miller-rabin
test(number-theory): add modular arithmetic test cases
docs(number-theory): explain bezout identity and modular inverse
docs(number-theory): explain repeated squaring and complexity
```

Done when: MT-01, MT-02, MT-03, MT-04, MT-05, MT-06, MT-09, MT-10 pass. Each algorithm has a doc in `docs/number-theory/`.

---

## Phase 2: RSA learning demo

**Owner:** B

**Goal:** toy RSA reproduced end to end, clearly separated from real crypto.

Tasks
- `toyRsa.generate(p, q, e)` returns `n, φ, d`
- `toyRsa.sign` / `toyRsa.verify` with the textbook example
- Reproduce `p=61, q=53, e=17, d=2753`, `65^2753 mod 3233 = 588`, `588^17 mod 3233 = 65`
- Write-up: why textbook RSA is insecure (deterministic, malleable, no padding) and why we use RSA-PSS

Commits
```text
feat(number-theory): add toy rsa key generation
feat(number-theory): add toy rsa sign and verify
test(number-theory): reproduce textbook rsa example
docs: explain toy rsa and why production uses rsa-pss
```

Done when: MT-07 and MT-08 pass. Doc includes a "never use this in production" section.

---

## Phase 3: Crypto service

**Owner:** B

**Goal:** `packages/crypto` with hash, sign, verify, key generation, key IDs.

Tasks
- `sha256(buffer)` and `sha256Stream(stream)`
- `generateKeyPair()` (RSA 2048+, PEM)
- `sign(bytes, privateKeyPem)` and `verify(bytes, sig, publicKeyPem)` with RSA-PSS
- Key loader that reads private keys from `KEYS_DIR`, never from the repo
- Tests: valid sig passes, one flipped byte fails, wrong key fails, tampered signature fails

Commits
```text
feat(crypto): add SHA-256 document hashing
feat(crypto): add streaming hash for uploads
feat(crypto): add RSA key pair generation
feat(crypto): add RSA-PSS signing and verification
test(crypto): cover tamper and wrong-key cases
docs: explain what bytes are signed and why
```

Done when: tamper and wrong-key tests pass. `docs/crypto.md` states the sign-bytes decision.

---

## Phase 4: Web app foundation

**Owner:** A (B owns the verification service logic)

**Goal:** working local app: login, institutions, certificate issue, PDF + QR, local ledger.

Tasks
- Prisma schema + migration + seed (2 fictional institutions, one user per role)
- Auth: login, JWT, `requireAuth`, `requireRole`
- Institution registration and key registration
- `LedgerService` interface + `LocalLedger` (hash-chained) + `verifyChain()`
- Certificate create: ID generation, PDF render, QR, hash, sign, ledger write, status transitions
- Verify endpoint implementing the exact check order from Architecture.md
- Revoke endpoint
- React: login, issue form, my certificates, public verify page
- Audit log writes

Commits (suggested order)
```text
feat(db): add prisma schema and seed data
feat(auth): add login endpoint
feat(auth): add auth and role middleware
feat(institutions): add institution registration
feat(keys): add issuer key registration
feat(ledger): add ledger service interface
feat(ledger): add hash-chained local ledger
test(ledger): detect tampered ledger entries
feat(pdf): add certificate template rendering
feat(qr): generate certificate verification QR
feat(certificates): add certificate creation endpoint
feat(certificates): integrate ledger issuance
feat(verify): add verification service
feat(certificates): add revocation endpoint
feat(web): add login and issue pages
feat(web): add public verification page
test(certificates): cover issue verify and revoke workflows
docs: add API reference and local setup guide
```

Done when: ST-01 to ST-09, ST-13, ST-15 pass against `LocalLedger`. Original PDF verifies, edited PDF is caught, revoke works.

---

## Phase 5: Fabric ledger

**Owner:** A leads, B reviews chaincode rules

**Goal:** `FabricLedger` passes the same tests as `LocalLedger`.

Timebox: **7 days.** If the network isn't running by day 4, stop and decide whether to scale back to one Fabric org plus the local ledger, and write the tradeoff in the report.

Tasks
- Fabric test network (2 orgs = 2 institutions), channel, identities
- Chaincode: `registerIssuer`, `updateIssuerStatus`, `registerIssuerKey`, `issueCertificate`, `getCertificate`, `revokeCertificate`, `getCertificateHistory`
- Chaincode rules: unknown issuer, disabled issuer, duplicate ID, already revoked
- `FabricLedger` adapter using Fabric Gateway
- Run the shared ledger test suite against both adapters
- `LEDGER_DRIVER` env switch

Commits
```text
chore(fabric): add test network scripts
feat(chaincode): add issuer registry functions
feat(chaincode): add certificate issuance chaincode
feat(chaincode): add revocation and history
test(chaincode): cover duplicate and unauthorized cases
feat(ledger): add fabric ledger adapter
test(ledger): run shared suite against both adapters
docs: add fabric setup and teardown guide
```

Done when: switching `LEDGER_DRIVER=fabric` passes the same ledger tests. Unreachable network yields `UNAVAILABLE` (ST-12).

---

## Phase 6: Full workflow and the rest of the UI

**Owner:** A (B reviews security logic)

**Goal:** all roles, all pages, all states.

Tasks
- Network admin dashboard: register/disable institutions
- Key management: register, retire, mark compromised (ST-10, ST-11)
- Holder portal
- Revocation management UI
- Ledger explorer + "verify chain" button (local) / tx list (Fabric)
- Number Theory Lab page (step-by-step output)
- Search and filters, dashboard totals
- Expiry handling (ST-08)

Commits
```text
feat(web): add network admin dashboard
feat(keys): add key retirement and compromise handling
feat(web): add key management page
feat(web): add holder portal
feat(web): add revocation management
feat(web): add ledger explorer
feat(web): add number theory lab page
feat(certificates): add search and filters
feat(verify): handle expired certificates
test(verify): cover key retirement and compromise
```

Done when: all ST cases pass; the final demo script runs start to finish.

---

## Phase 7: Evaluation and report

**Owner:** both

Tasks
- Performance: median and p95 over 20+ runs for PDF+sign, ledger commit, and verify (split into hash, signature, ledger lookup, total). Record machine specs and setup.
- Security walkthrough against the threat table in the PRD
- Usability pass (keyboard, contrast, error messages)
- Comparison: Fabric vs LocalLedger vs plain database
- Final report: design decisions, math, limitations, deviations (TypeScript chaincode if used)
- Demo script and rehearsal

Commits
```text
test: add end-to-end demo scenario
docs: add performance measurements
docs: add security and threat review
docs: add setup guide and final demonstration instructions
docs: add final report
```

Done when: PRD acceptance criteria 1-10 are all demonstrable.

---

## Demo script (what Phase 7 must run)

1. Register two fictional universities
2. Register a public signing key for each
3. Log in as University A, issue a certificate
4. Show PDF, ID, QR, hash, signature info
5. Show the ledger entry / transaction
6. Verify the original PDF: `VALID`
7. Change one character in a copy, verify: `DOCUMENT_MISMATCH`
8. Revoke the original
9. Verify again: `REVOKED`
10. Open the Number Theory Lab, reproduce the toy RSA example
11. (Bonus) Stop the ledger, verify: `UNAVAILABLE`
12. (Bonus) Edit a row in `LedgerEntry`, run chain verify: tamper detected

---

## Memory.md

Don't create it now. Create it at the first coding session of Phase 0, and update it at the end of every session with:

- Current phase and what's done
- Decisions made (and why)
- Next task
- Known bugs or open questions
- Commands to run the app and tests
