# LocalLedger: Hash-Chained Ledger Implementation

## What it does

LocalLedger implements the `LedgerService` interface using a PostgreSQL database with a hash-chained `LedgerEntry` table. Each entry contains a SHA-256 hash of the previous entry's hash concatenated with the canonical JSON of the current entry. This creates an immutable audit trail where any tampering with a past entry breaks the chain and is detected by `verifyChain()`.

## How the code works

### Core concepts

- **Genesis entry**: The first entry uses `prevHash = "0".repeat(64)` (64 zeros).
- **Canonical JSON**: All entries are serialized with keys sorted alphabetically so identical data always produces the same hash.
- **Entry hash**: `entryHash = SHA256(prevHash + canonicalJson({type, subjectId, payload, at}))`
- **Serializable transactions**: All writes use `isolationLevel: 'Serializable'` to prevent concurrent writes from using the same `prevHash`.

### Key functions

**`computeEntryHash()`** - Computes the hash for a new entry by combining the previous entry's hash with the canonical representation of the new entry's data.

**`canonicalJson()`** - Recursively sorts object keys alphabetically before JSON serialization. This ensures deterministic hashing regardless of property order.

**`verifyChain()`** - Walks through all entries in sequence order, recomputing each hash and comparing with the stored `entryHash`. Returns `{ valid: true }` if intact, or `{ valid: false, firstBrokenIndex }` if tampering is detected.

### Ledger operations

All `LedgerService` methods are implemented:

1. **`registerIssuer`** - Creates an `ISSUER_REGISTERED` entry with the issuer name.
2. **`setIssuerStatus`** - Creates an `ISSUER_STATUS_UPDATED` entry with new status (ACTIVE/DISABLED).
3. **`registerIssuerKey`** - Creates a `KEY_REGISTERED` entry linking keyId to issuerId and publicKeyPem.
4. **`setKeyStatus`** - Creates a `KEY_STATUS_UPDATED` entry (ACTIVE/RETIRED/COMPROMISED).
5. **`issueCertificate`** - Creates an `ISSUED` entry with full certificate data. Validates: no duplicate certificateId, issuer exists and is ACTIVE.
6. **`revokeCertificate`** - Creates a `REVOKED` entry with reasonCode and actorId. Validates: certificate exists and is not already REVOKED.
7. **`getCertificate`** - Returns the latest state by finding the ISSUED entry and checking for a later REVOKED entry.
8. **`getIssuer`** - Returns issuer info by finding the ISSUER_REGISTERED entry and the latest ISSUER_STATUS_UPDATED.
9. **`getHistory`** - Returns all ledger events for a certificate in chronological order.
10. **`verifyChain`** - Verifies the entire hash chain integrity.

## The logic: how chaining detects tampering

Each entry's `entryHash` depends on:
1. The previous entry's `entryHash` (via `prevHash`)
2. The current entry's complete data (type, subjectId, payload, timestamp)

This creates a cryptographic chain: changing any field in entry *n* changes its `entryHash`, which becomes the `prevHash` for entry *n+1*, causing entry *n+1*'s `entryHash` to mismatch, and so on to the end of the chain.

The `verifyChain()` function recomputes every hash from genesis forward. Any single-bit change in any entry's data or `prevHash` is detected at the first recomputed mismatch.

### Honest limit

**One Postgres owner can rewrite the whole chain.** Since the database is centralized, anyone with write access to the `LedgerEntry` table can:
1. Modify an old entry
2. Recompute all subsequent hashes
3. Update the entire table

This is exactly why Phase 5 introduces Hyperledger Fabric: distributed consensus makes rewriting history computationally infeasible without controlling a majority of peers. The comparison between LocalLedger (trust the server) and FabricLedger (trust the network) is a key deliverable in the final report.

## How to run and test

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run db:generate --workspace=apps/api

# Run ledger tests
npm run test --workspace=packages/ledger
```

Tests cover:
- Basic CRUD operations for all ledger entry types
- Duplicate certificate rejection
- Unknown/disabled issuer rejection
- Double revocation rejection
- History ordering
- Chain verification (valid chain, tampered entryHash, tampered prevHash, tampered payload)
- Append-only property (entry count increases monotonically)