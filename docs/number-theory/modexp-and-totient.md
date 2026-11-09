# Fast Modular Exponentiation and Euler's Totient

## Euler's Totient Function

Euler's totient function φ(n) counts the positive integers up to n that are coprime to n.

### For n = p·q (product of two distinct primes)

```
φ(p·q) = (p-1)(q-1)
```

This is because:
- Numbers 1 to pq: there are pq total
- Multiples of p: q of them (p, 2p, ..., qp)
- Multiples of q: p of them (q, 2q, ..., pq)
- Multiple of both (pq): 1 of them
- By inclusion-exclusion: pq - q - p + 1 = (p-1)(q-1)

**Example: p=61, q=53**
```
n = 61 × 53 = 3233
φ(n) = 60 × 52 = 3120
```

### General φ(n) via prime factorization

If n = p₁^e₁ · p₂^e₂ · ... · pₖ^eₖ, then:

```
φ(n) = n · ∏(1 - 1/pᵢ)  for all distinct prime factors pᵢ
```

Or equivalently:
```
φ(n) = ∏ pᵢ^(eᵢ-1) · (pᵢ - 1)
```

**Example: n = 60 = 2² × 3 × 5**
```
φ(60) = 60 × (1-1/2) × (1-1/3) × (1-1/5)
      = 60 × 1/2 × 2/3 × 4/5
      = 16
```

Our implementation uses trial division to find prime factors, then applies the formula.

---

## Fast Modular Exponentiation (Repeated Squaring)

### The Problem

Compute `base^exp mod mod` efficiently. Naive multiplication takes O(exp) time, which is infeasible for large exponents (e.g., 2048-bit RSA exponents).

### The Algorithm: Repeated Squaring

Write the exponent in binary. For each bit from LSB to MSB:
- Square the current base
- If the bit is 1, multiply the result by the current base

**Example: 3^13 mod 7**
```
13 = 1101₂ = 1·2³ + 1·2² + 0·2¹ + 1·2⁰

3^13 = 3^(8+4+1) = 3^8 · 3^4 · 3^1
```

| Step | Bit | Action | Base (mod 7) | Result (mod 7) |
|------|-----|--------|--------------|----------------|
| 0    | -   | init   | 3            | 1              |
| 1    | 1   | ×      | 3            | 1×3 = 3        |
| 2    | -   | ²      | 3² = 2       | 3              |
| 3    | 0   | -      | 2            | 3              |
| 4    | -   | ²      | 2² = 4       | 3              |
| 5    | 1   | ×      | 4            | 3×4 = 12 ≡ 5   |
| 6    | -   | ²      | 4² = 2       | 5              |
| 7    | 1   | ×      | 2            | 5×2 = 10 ≡ 3   |

Result: 3 ✓ (since 3^13 = 1594323, and 1594323 mod 7 = 3)

### Why O(log exp)?

Each bit of the exponent requires at most 2 multiplications (one square, optionally one multiply). An integer `exp` has `⌊log₂ exp⌋ + 1` bits. So total multiplications ≤ 2·log₂(exp).

**Timing comparison (approximate):**
| Exponent size | Naive O(exp) | Repeated Squaring O(log exp) |
|---------------|--------------|------------------------------|
| 10 bits       | ~1,000 ops   | ~20 ops                      |
| 20 bits       | ~1,000,000   | ~40 ops                      |
| 1024 bits     | ~10^308      | ~2,048 ops                   |
| 2048 bits     | impossible   | ~4,096 ops                   |

---

## Euler's Theorem

If `gcd(a, n) = 1`, then:
```
a^φ(n) ≡ 1 (mod n)
```

This generalizes Fermat's Little Theorem.

### Fermat's Little Theorem

If `p` is prime and `p ∤ a`, then:
```
a^(p-1) ≡ 1 (mod p)
```

This is a special case of Euler's theorem since φ(p) = p-1 for prime p.

### Application to RSA

In RSA with n = p·q:
- φ(n) = (p-1)(q-1)
- Public key: (e, n) where gcd(e, φ(n)) = 1
- Private key: d where e·d ≡ 1 (mod φ(n))

Then for any message m coprime to n:
```
m^(e·d) ≡ m^(1 + k·φ(n)) ≡ m · (m^φ(n))^k ≡ m · 1^k ≡ m (mod n)
```

This is why decryption works.

**Example with p=61, q=53, e=17:**
```
n = 3233
φ(n) = 3120
d = 2753 (since 17·2753 ≡ 1 mod 3120)

Check: 17^3120 mod 3233 = 1 (Euler's theorem)
Check: 65^2753 mod 3233 = 588 (signing)
Check: 588^17 mod 3233 = 65 (verification)
```

---

## Implementation Notes

- **BigInt throughout**: Handles arbitrarily large integers for RSA-scale numbers
- **Step recording**: Both `modExp` and `totient` return step tables for educational display
- **Input validation**: Throws on non-positive modulus, negative exponent, etc.
- **Prime product totient**: Optimized O(1) formula for RSA modulus
- **General totient**: O(√n) trial division, suitable for numbers up to ~10^12

---

## Running the Code

```bash
npm run test --workspace=packages/number-theory
```

The test file `packages/number-theory/src/commit4.test.ts` covers:
- `totientPrimeProduct(61, 53) = 3120`
- General `totient` for various inputs (primes, prime powers, composites)
- `modExp` with step table verification
- Exponent 0 returns 1
- Invalid inputs throw errors
- Euler theorem checker for coprime and non-coprime cases
- Fermat's Little Theorem checker
- RSA-specific Euler check (17^3120 ≡ 1 mod 3233)