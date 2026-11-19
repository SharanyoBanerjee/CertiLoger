# CertiLedger Security Review

> Academic prototype. Fictional institutions, synthetic data. No legal recognition, no real government integration, not production ready.

---

## Threat Model Mapping (from PRD)

This document maps the PRD threat table to implemented mitigations.

| Threat | PRD Reference | Mitigation Implemented | Status |
|--------|---------------|------------------------|--------|
| **T1: Private key theft** | NFR-02 | Private keys stored in `KEYS_DIR` on server only; never in frontend, git, logs, or API responses; loaded at sign time only | ✅ Mitigated |
| **T2: Malicious issuer** | NFR-01, NFR-14 | RBAC on every route (`requireAuth` + `requireRole`); institution scoping; audit logs for all actions | ✅ Mitigated |
| **T3: Certificate forgery** | NFR-03, NFR-06 | SHA-256 + RSA-PSS signing via node:crypto; verification checks signature + hash + ledger status; never marks ISSUED before ledger commit | ✅ Mitigated |
| **T4: Ledger tampering** | NFR-04, NFR-06 | Hash-chained ledger (`prevHash` + SHA-256); `verifyChain()` detects tampering; serializable transactions | ✅ Partially Mitigated* |
| **T5: Replay attacks** | — | JWT with short expiry (15min) + refresh token rotation; nonce not implemented (API is stateless) | ⚠️ Partial |
| **T6: PDF tampering after issuance** | NFR-03, NFR-06 | SHA-256 of exact PDF bytes stored on ledger; verification recomputes hash; any byte change detected | ✅ Mitigated |
| **T7: Key compromise** | NFR-02, NFR-14 | Key status lifecycle (ACTIVE/RETIRED/COMPROMISED); COMPROMISED keys invalidate all certs; key rotation supported | ✅ Mitigated |
| **T8: PII on ledger** | NFR-04 | Ledger stores only: certId, issuerId, docHash, signature, keyId, timestamps, status — no names, grades, emails | ✅ Mitigated |
| **T9: Man-in-the-middle** | — | HTTPS required in production (not enforced in dev); JWT in Authorization header | ⚠️ Dev Only |
| **T10: Brute force login** | — | Rate limiting not implemented; bcrypt cost 10; JWT short expiry | ⚠️ Partial |
| **T11: SQL injection** | — | Prisma ORM (parameterized queries); zod validation at route boundary | ✅ Mitigated |
| **T12: XSS** | — | React auto-escapes; no `dangerouslySetInnerHTML`; CSP not configured | ⚠️ Partial |
| **T13: CSRF** | — | JWT in Authorization header (not cookies); no cookie-based auth | ✅ Mitigated |
| **T14: File upload attacks** | — | Multer: memory storage, 10MB limit, PDF-only MIME check | ✅ Mitigated |
| **T15: Denial of service (verify)** | — | Rate limiting not implemented on `/api/certificates/:id/verify` | ❌ Not Implemented |

\* **T4 Limitation:** LocalLedger runs on single Postgres instance; a database owner can rewrite the entire chain. This is the "honest limit" documented in Architecture.md — exactly why Fabric exists for production.

---

## Implemented Security Controls

### Authentication & Authorization

| Control | Implementation |
|---------|----------------|
| **Password hashing** | bcrypt, cost 10 |
| **JWT tokens** | 15min access + 7day refresh; RS256 (not implemented, using HS256 with JWT_SECRET) |
| **Role-based access** | `requireRole('NETWORK_ADMIN' \| 'INSTITUTION_ADMIN' \| 'ISSUER' \| 'HOLDER' \| 'AUDITOR')` |
| **Institution scoping** | `requireInstitutionAccess` middleware checks `user.institutionId` |
| **Route protection** | Every protected route has `requireAuth` + `requireRole` |

### Cryptography

| Control | Implementation |
|---------|----------------|
| **Hashing** | SHA-256 via `node:crypto` (`createHash('sha256')`) |
| **Signing** | RSA-PSS via `node:crypto` (`createSign('sha256')` with PSS padding) |
| **Key size** | RSA 2048-bit (generated via `generateKeyPairSync`) |
| **Key storage** | Private keys in `KEYS_DIR/{keyId}.pem` (filesystem, gitignored) |
| **Key lifecycle** | ACTIVE / RETIRED / COMPROMISED statuses |

### Ledger Integrity

| Control | Implementation |
|---------|----------------|
| **Hash chaining** | `entryHash = SHA256(prevHash + canonicalJSON({type, subjectId, payload, at}))` |
| **Genesis hash** | `0`.repeat(64) |
| **Tamper detection** | `verifyChain()` recomputes all hashes in sequence |
| **Concurrency control** | Prisma serializable transactions for all writes |

### Data Protection

| Control | Implementation |
|---------|----------------|
| **PII off-ledger** | Only certificate ID, issuer ID, document hash, signature, key ID, timestamps, status on ledger |
| **PDFs off-chain** | Stored in `STORAGE_DIR` (filesystem, gitignored) |
| **Input validation** | Zod schemas at every route boundary |
| **Error handling** | Generic error messages; no stack traces, SQL, or keys in responses |

---

## Security Review Checklist

### Pre-Deployment (if this were production)

- [ ] Enable HTTPS/TLS termination
- [ ] Configure rate limiting on verify endpoint
- [ ] Implement CSP headers
- [ ] Switch JWT to RS256 with rotating keys
- [ ] Add request logging & monitoring
- [ ] Implement CSRF protection if cookies used
- [ ] Configure CORS properly for production domain
- [ ] Set up database backups & point-in-time recovery
- [ ] Configure WAF/DDoS protection
- [ ] Run penetration test
- [ ] Document incident response procedure

### Code Quality Gates (Currently Enforced)

- ✅ TypeScript strict mode
- ✅ ESLint + Prettier (pre-commit)
- ✅ Vitest unit/integration tests
- ✅ Zod validation at route boundaries
- ✅ No `any` without justification (warnings only)
- ✅ Conventional commits

---

## Known Limitations & Accepted Risks

| Risk | Impact | Likelihood | Accepted? |
|------|--------|------------|-----------|
| LocalLedger single-node trust | Database owner can rewrite history | High (if DB compromised) | ✅ Yes (academic prototype) |
| No rate limiting on verify | DoS via hash correlation | Medium | ⚠️ Accepted for prototype |
| HS256 JWT (not RS256) | Key rotation harder | Low | ✅ Accepted for prototype |
| No CSP headers | XSS risk if XSS exists | Low | ⚠️ Accepted for prototype |
| No request/response logging | Harder incident response | Medium | ⚠️ Accepted for prototype |
| Dev HTTPS not enforced | MITM in dev | High (dev only) | ✅ Accepted (dev only) |

---

## Incident Response (Prototype)

Since this is an academic prototype, no formal IR process exists. In a real deployment:

1. **Detect** — Monitoring alerts (not implemented)
2. **Contain** — Revoke compromised keys via `/api/keys/:keyId/status`
3. **Eradicate** — Rotate JWT secret, regenerate keys
4. **Recover** — Verify ledger chain with `verifyChain()`
5. **Lessons** — Document in postmortem

---

## Compliance Notes

This prototype does **not** comply with any regulatory framework (GDPR, HIPAA, SOX, etc.). It is designed for educational demonstration only.

---

## References

- `docs/PRD.md` — Threat table (section 11)
- `docs/Architecture.md` — Security rules (section 2)
- `docs/Rules.md` — Binding security rules (section 2)
- `docs/ARCHITECTURE_OVERVIEW.md` — Architecture with security annotations
- `packages/crypto/src/index.ts` — Crypto implementation
- `packages/ledger/src/localLedger.ts` — Ledger implementation
- `apps/api/src/middleware/auth.ts` — Auth & RBAC middleware