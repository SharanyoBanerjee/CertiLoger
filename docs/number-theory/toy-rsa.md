# Toy RSA and Why Production Uses RSA-PSS

## Toy RSA Implementation

This document explains the toy RSA implementation in the Number Theory Lab and why it must never be used in production.

### Key Generation

Given two distinct primes `p` and `q` and a public exponent `e`:

```
n = p × q
φ(n) = (p-1)(q-1)
d = e⁻¹ mod φ(n)
```

**Example (textbook):**
- p = 61, q = 53
- n = 3233
- φ(n) = 60 × 52 = 3120
- e = 17
- d = 2753 (since 17 × 2753 ≡ 1 mod 3120)

### Signing and Verification

**Sign:** `s = m^d mod n`
**Verify:** `m = s^e mod n`

**Example:**
- Message m = 65
- Sign: 65^2753 mod 3233 = 588
- Verify: 588^17 mod 3233 = 65 ✓

### The Round-Trip Property

For any message m coprime to n:
```
m^(e·d) ≡ m^(1 + k·φ(n)) ≡ m · (m^φ(n))^k ≡ m · 1^k ≡ m (mod n)
```

This works because of Euler's theorem: `m^φ(n) ≡ 1 (mod n)` when `gcd(m, n) = 1`.

---

## Why Textbook RSA Is Insecure

### 1. Deterministic Encryption/Signing

Textbook RSA always produces the same output for the same input. This allows:

- **Chosen-plaintext attacks**: Attacker can encrypt guesses and compare
- **Signature forgery**: If you see signatures on m₁ and m₂, you can compute signature on m₁·m₂ (malleability)

### 2. Malleability

```
(m₁)^d · (m₂)^d ≡ (m₁·m₂)^d (mod n)
```

An attacker can combine signatures to create valid signatures on new messages without knowing the private key.

### 3. No Padding = Structural Attacks

Without padding:
- Small messages (m < n^(1/e)) can be recovered by taking the e-th root over integers
- Common modulus attacks when multiple users share n
- Hastad's broadcast attack when same message sent to multiple recipients

### 4. No Semantic Security

Identical messages produce identical ciphertexts/signatures, leaking information about the message content.

---

## Why We Use RSA-PSS in Production

### What Is RSA-PSS?

RSA-PSS (Probabilistic Signature Scheme, RFC 8017) adds:
1. **Random salt** - Different signature every time
2. **Mask generation function (MGF1)** - Hash-based masking
3. **Structured encoding** - EMSA-PSS encoding with hash, salt, and trailer

### Security Properties

| Property | Textbook RSA | RSA-PSS |
|----------|--------------|---------|
| Deterministic | Yes | No (random salt) |
| Malleable | Yes | No |
| Existential forgery resistant | No | Yes (in random oracle model) |
| Provable security | No | Yes (reduction to RSA problem) |

### Our Implementation (packages/crypto)

```typescript
const pss = {
  padding: constants.RSA_PKCS1_PSS_PADDING,
  saltLength: constants.RSA_PSS_SALTLEN_DIGEST, // salt = hash length
};

export const sign = (data: Buffer, privateKeyPem: string) =>
  createSign('sha256').update(data).sign({ key: privateKeyPem, ...pss }, 'base64');

export const verify = (data: Buffer, signature: string, publicKeyPem: string) =>
  createVerify('sha256').update(data).verify({ key: publicKeyPem, ...pss }, signature, 'base64');
```

**Key decisions:**
- **Sign the PDF bytes directly**, not a pre-computed hash (createSign hashes internally)
- **RSA 2048 minimum**, 3072 recommended for production
- **PSS salt length = hash length** (32 bytes for SHA-256), maximum security

---

## Error Probability in Miller-Rabin

For a composite number n, each round of Miller-Rabin has at most 1/4 probability of incorrectly reporting "probably prime". With `k` rounds:

```
Error probability ≤ 4^(-k)
```

- 10 rounds: ≤ 1 in 1,048,576
- 20 rounds: ≤ 1 in 1.1 × 10¹²
- 40 rounds: ≤ 1 in 1.2 × 10²⁴

Our default: **20 rounds** (error probability ≤ 2⁻⁴⁰).

---

## Running the Lab

```bash
# Start API server
npm run dev --workspace=apps/api

# Test endpoints
curl -X POST http://localhost:3000/api/lab/gcd \
  -H "Content-Type: application/json" \
  -d '{"a": "17", "b": "3120"}'

curl -X POST http://localhost:3000/api/lab/toy-rsa/generate \
  -H "Content-Type: application/json" \
  -d '{"p": "61", "q": "53", "e": "17"}'
```

All BigInt values are returned as strings in JSON to avoid precision loss.

---

## Summary

| Component | Purpose | Production Safe? |
|-----------|---------|------------------|
| isPrimeTrial | Educational, O(√n) | No (too slow) |
| millerRabin | Educational, O(k log³ n) | With sufficient rounds, yes |
| toyRsaGenerate/Sign/Verify | Educational only | **NEVER** - no padding, deterministic |
| packages/crypto (RSA-PSS) | Production signing | **YES** - RFC 8017 compliant |

The Number Theory Lab exists to demonstrate the mathematical foundations. The production signing path in `packages/crypto` uses Node's built-in `crypto` module with RSA-PSS and must never import from `number-theory`.