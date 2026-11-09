export interface TotientResult {
  value: bigint;
  steps: { p: bigint; q: bigint } | { n: bigint; factors: { prime: bigint; exponent: bigint }[] };
}

/**
 * Euler's totient function for n = p * q where p and q are distinct primes.
 * φ(p*q) = (p-1)*(q-1)
 */
export function totientPrimeProduct(p: bigint, q: bigint): TotientResult {
  if (p <= 1n || q <= 1n) {
    throw new Error('Primes must be greater than 1');
  }
  if (p === q) {
    throw new Error('Primes must be distinct');
  }

  const phi = (p - 1n) * (q - 1n);
  return {
    value: phi,
    steps: { p, q },
  };
}

/**
 * General Euler's totient function using trial division factorization.
 * φ(n) = n * ∏(1 - 1/p) for all distinct prime factors p of n
 */
export function totient(n: bigint): TotientResult {
  if (n <= 0n) {
    throw new Error('Input must be positive');
  }
  if (n === 1n) {
    return { value: 1n, steps: { n: 1n, factors: [] } };
  }

  let result = n;
  const factors: { prime: bigint; exponent: bigint }[] = [];
  let remaining = n;

  // Check factor 2
  let count = 0n;
  while (remaining % 2n === 0n) {
    remaining /= 2n;
    count++;
  }
  if (count > 0n) {
    factors.push({ prime: 2n, exponent: count });
    result = result / 2n; // result *= (1 - 1/2)
  }

  // Check odd factors up to sqrt(remaining)
  for (let p = 3n; p * p <= remaining; p += 2n) {
    count = 0n;
    while (remaining % p === 0n) {
      remaining /= p;
      count++;
    }
    if (count > 0n) {
      factors.push({ prime: p, exponent: count });
      result = (result / p) * (p - 1n); // result *= (1 - 1/p)
    }
  }

  // If remaining > 1, it's a prime factor
  if (remaining > 1n) {
    factors.push({ prime: remaining, exponent: 1n });
    result = (result / remaining) * (remaining - 1n);
  }

  return {
    value: result,
    steps: { n, factors },
  };
}
