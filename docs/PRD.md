# CertiLedger: Project Requirements Document

> Academic prototype. Fictional institutions, synthetic data. No legal recognition, no real government integration, not production ready.

## 1. What we're building

A platform where approved institutions issue digitally signed certificates, and anyone can verify three things about a PDF:

1. **Who issued it** (digital signature + issuer registry)
2. **Whether it changed** (SHA-256 of the exact bytes)
3. **Whether it's still valid** (latest ledger status: issued, revoked, expired)

Personal data and PDFs stay off the ledger. The ledger holds only the minimum proof: certificate ID, issuer ID, document hash, signature, key ID, timestamps, status.

## 2. Problem

PDF certificates are easy to copy and edit. A recipient can't tell if the issuer is real, if the file was altered, or if the certificate was cancelled later. Manual checks mean emailing the institution.

## 3. Goals

1. Working issue / verify / revoke lifecycle for simulated institutions.
2. A tested Number Theory Lab (GCD, extended GCD, modular inverse, totient, fast modular exponentiation, Miller-Rabin, toy RSA).
3. Real signing with SHA-256 and RSA-PSS through Node's `crypto` (never the toy code).
4. A ledger behind a clean interface: local hash-chained log first, Hyperledger Fabric later.
5. Measured correctness, security behaviour and performance.

## 4. Users

| Role | Can do |
|---|---|
| Network admin | Register and disable institutions |
| Institution admin | Manage users, templates, signing keys |
| Authorized issuer | Create, issue, revoke certificates |
| Holder | View, download, share a certificate |
| Verifier | Check a certificate by ID or PDF upload |
| Auditor (optional) | Read issuance and revocation history |

## 5. Scope

**In:** 2-3 fictional institutions, auth + RBAC, PDF + QR generation, SHA-256 + RSA-PSS, ledger (local, then Fabric), verify by ID and by file, revocation, audit history, Number Theory Lab.

**Out:** real government or Aadhaar integration, legal recognition, tokens or payments, new cryptography, PDFs or personal data on-chain, production deployment.

## 6. Functional requirements

**Must**

| ID | Requirement |
|---|---|
| FR-01 | Secure login |
| FR-02 | Role-based access control, enforced server-side |
| FR-03 | Network admin registers and disables institutions |
| FR-04 | Institutions have public signing keys with key ID/version |
| FR-05 | Issuer fills certificate details from an approved template |
| FR-06 | Unique certificate ID per issuance |
| FR-07 | PDF contains certificate ID and verification QR/URL |
| FR-08 | SHA-256 of the exact PDF bytes |
| FR-09 | RSA-PSS signature via standard library |
| FR-10 | Ledger records ID, issuer, hash, signature, key ID, time, status |
| FR-11 | Holder can retrieve the issued PDF |
| FR-12 | Verify by certificate ID or QR link |
| FR-13 | Verify by PDF upload (hash + signature) |
| FR-14 | Check issuer and key trust |
| FR-15 | Check latest status and expiry |
| FR-16 | Issuer can revoke with a reason code |
| FR-17 | Issuance and revocation events are preserved, never deleted |
| FR-18 | Plain-language result with a reason for each failed check |
| FR-19 | Audit log for login, issue, revoke, key-status changes |

**Should:** search/filter (FR-20), dashboard totals (FR-21), ledger explorer (FR-22), key rotation (FR-23).
**Could:** multiple templates (FR-24), exportable reports (FR-25), W3C Verifiable Credentials (FR-26).

## 7. Verification outcomes

`VALID`, `NOT_FOUND`, `DOCUMENT_MISMATCH`, `SIGNATURE_INVALID`, `ISSUER_UNTRUSTED`, `REVOKED`, `EXPIRED`, `UNAVAILABLE`.

`UNAVAILABLE` means "couldn't check". It never means valid or invalid.

## 8. Non-functional requirements

- Auth and authorization on every protected route (NFR-01).
- Private keys never in frontend code, git, or logs (NFR-02).
- Standard crypto library only (NFR-03).
- PII and PDFs off-chain (NFR-04).
- Never report success before the ledger commits (NFR-06).
- Every security-relevant action tied to a user and timestamp (NFR-07).
- Server-side validation of fields, dates, IDs, status transitions (NFR-14).
- Measure issue and verify latency, report test conditions (NFR-11).

## 9. Acceptance criteria

1. Two institutions registered with distinct identities.
2. End-to-end issue works for an authorized issuer.
3. PDF has a unique ID and verification reference.
4. SHA-256 and RSA-PSS run through a maintained library.
5. Ledger layer rejects unknown issuers and duplicate IDs.
6. Issuance and revocation events are stored, and current status is queryable.
7. Original PDF verifies. An edited copy is caught.
8. Revoked certificate shows `REVOKED` on next verification.
9. Number Theory Lab covers GCD, extended GCD, modular inverse, fast modular exponentiation, toy RSA, all with tests.
10. Report documents limitations, test evidence, and performance numbers.

## 11. Limitations to disclose

- A valid signature doesn't prove the claims are true.
- A ledger can't stop an authorized but dishonest issuer.
- A QR code is a pointer, not security.
- A stolen private key can be abused until detected.
- Raw-byte hashing rejects a harmlessly re-saved PDF.
- No legal recognition for the participating institutions.

## 12. Source documents

Full specification: `CertiLedger_PRD.pdf` (v1.0, 7 Nov 2026). Standards: RFC 8017 (RSA-PSS), FIPS 180-4 (SHA-256), FIPS 186-5 (DSS), Hyperledger Fabric docs, W3C VC Data Model 2.0.
