# Euclid's Algorithm and Modular Inverse

## Euclidean Algorithm (GCD)

The greatest common divisor (GCD) of two integers is the largest positive integer that divides both. Euclid's algorithm computes it efficiently using the identity:

```
gcd(a, b) = gcd(b, a mod b)
```

### Step-by-step example: gcd(17, 3120)

| Step | a    | b   | q = a ÷ b | r = a mod b |
|------|------|-----|-----------|-------------|
| 1    | 3120 | 17  | 183       | 9           |
| 2    | 17   | 9   | 1         | 8           |
| 3    | 9    | 8   | 1         | 1           |
| 4    | 8    | 1   | 8         | 0           |

When the remainder reaches 0, the last non-zero remainder (1) is the GCD.

So `gcd(17, 3120) = 1`, meaning 17 and 3120 are coprime.

### Why it works

If `d` divides both `a` and `b`, then `d` divides `a - q·b = r`. So any common divisor of `(a, b)` is also a common divisor of `(b, r)`. Conversely, any common divisor of `(b, r)` divides `q·b + r = a`. The two pairs have exactly the same common divisors, hence the same greatest common divisor.

Each step reduces the numbers, so the algorithm terminates. The number of steps is at most `5·log₁₀(min(a,b))` (Lamé's theorem).

---

## Extended Euclidean Algorithm (Bézout's Identity)

Bézout's identity states that for any integers `a, b`, there exist integers `x, y` such that:

```
a·x + b·y = gcd(a, b)
```

The extended Euclidean algorithm finds these coefficients by working backwards through Euclid's steps.

### Coefficients for 17 and 3120

From the GCD table above, we track the quotients: `[183, 1, 1, 8]`

Working backwards:
- `1 = 9 - 1·8`
- `8 = 17 - 1·9` → `1 = 9 - 1·(17 - 1·9) = 2·9 - 1·17`
- `9 = 3120 - 183·17` → `1 = 2·(3120 - 183·17) - 1·17 = 2·3120 - 367·17`

So `x = -367`, `y = 2`, and `17·(-367) + 3120·2 = 1`.

Our implementation returns the positive equivalent: `x = 2753` (since `-367 ≡ 2753 (mod 3120)`), `y = -15` (since `2 ≡ -15 (mod 17)`). Both pairs satisfy the identity.

---

## Modular Inverse

The modular inverse of `a` modulo `n` is an integer `x` such that:

```
a·x ≡ 1 (mod n)
```

This exists **iff** `gcd(a, n) = 1` (i.e., `a` and `n` are coprime).

### Why Bézout gives the inverse

From Bézout: `a·x + n·y = gcd(a, n)`

If `gcd(a, n) = 1`, then `a·x + n·y = 1`.

Taking modulo `n`: `a·x ≡ 1 (mod n)`.

So the Bézout coefficient `x` (reduced modulo `n`) is exactly the modular inverse.

### Example: inverse of 17 mod 3120

From above: `17·(-367) + 3120·2 = 1`

Modulo 3120: `17·(-367) ≡ 1 (mod 3120)`

The positive representative: `-367 + 3120 = 2753`

Check: `17 × 2753 = 46801 = 3120 × 15 + 1 ≡ 1 (mod 3120)` ✓

### When no inverse exists

If `gcd(a, n) ≠ 1`, then `a·x + n·y = d` where `d > 1`.

Modulo `n`: `a·x ≡ d (mod n)`.

Since `d ≠ 1`, we can never get `1` on the right side. No inverse exists.

Example: `modInverse(12, 18)` → `gcd(12, 18) = 6 ≠ 1` → returns `null`.

---

## Implementation Notes

- **BigInt throughout**: All functions use `bigint` to handle arbitrarily large integers without precision loss.
- **Negative inputs**: Both `gcd` and `extendedGcd` take absolute values. The returned coefficients satisfy the equation with the absolute values.
- **modInverse normalization**: Input `a` is normalized to `[0, n-1]` before computation. The result is always in `[0, n-1]`.
- **Steps recording**: Both `gcd` and `extendedGcd` return the step table for educational display.

---

## Complexity

- **Time**: O(log min(a, b)) divisions
- **Space**: O(log min(a, b)) for the step table (O(1) without it)
- Each division reduces the larger number by at least half every two steps.

---

## Running the Code

```bash
npm run test --workspace=packages/number-theory
```

The test file `packages/number-theory/src/number-theory.test.ts` covers:
- `gcd(12, 18) = 6` with step verification
- `gcd(17, 3120) = 1`
- Negative input handling
- Large integer values
- `extendedGcd` Bézout coefficient verification
- `modInverse(17, 3120) = 2753`
- No-inverse cases (returns `null`)
- Negative `a` handling
- Error on non-positive modulus