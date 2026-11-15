# Verification Service and Revocation

## What it does

The verification service implements the complete certificate verification flow as specified in Architecture.md section 8. It performs a series of checks in a specific order (cheap and decisive checks first) and returns detailed results for each check plus an overall state. The revocation service handles certificate revocation with proper authorization and ledger commit.

## How the code works

### Verification check order (from Architecture.md section 8)

1. **LEDGER_LOOKUP** - `ledger.getCertificate(id)` → `NOT_FOUND` if null
2. **ISSUER_STATUS** - `ledger.getIssuer(record.issuerId)` → `ISSUER_UNTRUSTED` if missing or disabled
3. **KEY_STATUS** - Get public key from registry for `record.keyId` → `ISSUER_UNTRUSTED` if missing or COMPROMISED (RETIRED keys still verify)
4. **DOCUMENT_HASH** - `sha256(upload) === record.documentHash` → `DOCUMENT_MISMATCH` if different (skipped if no file)
5. **SIGNATURE** - `verify(upload, record.signature, publicKey)` → `SIGNATURE_INVALID` if fails (skipped if no file)
6. **REVOCATION_STATUS** - `record.status === REVOKED` → `REVOKED`
7. **EXPIRY** - `expiresAt` in the past → `EXPIRED`
8. **VALID** - All checks pass

### Key design decisions

- **Public key from registry, never from PDF** - The uploaded PDF is never trusted for the public key
- **RETIRED vs COMPROMISED keys** - RETIRED keys still verify old certificates; COMPROMISED keys don't
- **LedgerUnavailableError** → `UNAVAILABLE` (never VALID or INVALID)
- **Verify by ID only** (no file) runs steps 1, 2, 3, 6, 7 and returns `FILE_NOT_CHECKED`
- **Every check returned** - Response includes all checks with pass/fail/skipped status and reason

### Revocation flow

1. Authenticate + role = ISSUER or INSTITUTION_ADMIN
2. Certificate belongs to caller's institution
3. Status must be ISSUED
4. `ledger.revokeCertificate(id, reasonCode, actorId)` — must commit
5. On success: status REVOKED, write CertificateEvent + AuditLog
6. On failure: status unchanged, return error

## API Routes

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/certificates/:id/verify` | public, rate-limited | Verify certificate (file optional) |
| POST | `/api/certificates/:id/revoke` | ISSUER, INST_ADMIN | Revoke certificate |
| GET | `/api/certificates/:id/history` | scoped | Certificate lifecycle events |

### Verify Response Example

```json
{
  "certificateId": "CERT-ABC123",
  "overallState": "VALID",
  "checks": [
    { "check": "LEDGER_LOOKUP", "status": "pass", "reason": "Certificate found in ledger" },
    { "check": "ISSUER_STATUS", "status": "pass", "reason": "Issuer Test University is active" },
    { "check": "KEY_STATUS", "status": "pass", "reason": "Key INST-001-KEY-01 is ACTIVE" },
    { "check": "DOCUMENT_HASH", "status": "pass", "reason": "Document hash matches ledger record" },
    { "check": "SIGNATURE", "status": "pass", "reason": "Signature verified with issuer public key" },
    { "check": "REVOCATION_STATUS", "status": "pass", "reason": "Certificate is not revoked" },
    { "check": "EXPIRY", "status": "pass", "reason": "Certificate is not expired" }
  ],
  "verifiedAt": "2026-11-15T10:30:00.000Z"
}
```

## Decision Table

| Check Order | Check | Fail Condition | Overall State | Reason |
|-------------|-------|----------------|---------------|--------|
| 1 | LEDGER_LOOKUP | Certificate not found | NOT_FOUND | No record in ledger |
| 2 | ISSUER_STATUS | Issuer missing or DISABLED | ISSUER_UNTRUSTED | Issuer not registered or disabled |
| 3 | KEY_STATUS | Key missing or COMPROMISED | ISSUER_UNTRUSTED | No valid signing key |
| 4 | DOCUMENT_HASH | Hash mismatch | DOCUMENT_MISMATCH | PDF was modified |
| 5 | SIGNATURE | Signature invalid | SIGNATURE_INVALID | Signature doesn't match |
| 6 | REVOCATION_STATUS | Status = REVOKED | REVOKED | Certificate revoked |
| 7 | EXPIRY | expiresAt < now | EXPIRED | Certificate expired |
| - | All pass (with file) | - | VALID | Fully verified |
| - | All pass (no file) | - | FILE_NOT_CHECKED | Metadata only |
| Any | LedgerUnavailableError | - | UNAVAILABLE | Ledger unreachable |

### Why this order?

1. **LEDGER_LOOKUP** - Cheapest, most decisive. If no record, nothing else matters.
2. **ISSUER_STATUS** - Validates the trust anchor. Disabled issuer = untrustworthy.
3. **KEY_STATUS** - Checks the signing key. COMPROMISED key = all signatures suspect.
4. **DOCUMENT_HASH** - Fast binary comparison. Catches document tampering early.
5. **SIGNATURE** - Cryptographic verification. Expensive but definitive.
6. **REVOCATION_STATUS** - Business logic check. Revoked = invalid regardless of signature.
7. **EXPIRY** - Final validity check. Expired certificates are not valid.

The order ensures we fail fast on the most common and decisive failures, and we never return VALID if any check failed or couldn't run.

## How to run and test

```bash
# Run verification tests (requires database)
npm run test --workspace=apps/api

# Test verify endpoint
curl -X POST http://localhost:3000/api/certificates/CERT-ABC123/verify \
  -F "file=@certificate.pdf"

# Test revoke endpoint
curl -X POST http://localhost:3000/api/certificates/CERT-ABC123/revoke \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"reasonCode": "REVOKED_BY_ISSUER"}'

# Test history endpoint
curl http://localhost:3000/api/certificates/CERT-ABC123/history \
  -H "Authorization: Bearer <token>"
```