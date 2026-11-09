import { modExp } from './modExp.js';
import { totient, totientPrimeProduct } from './totient.js';
import { gcd } from './gcd.js';

export interface TheoremCheckResult {
  holds: boolean;
  a: bigint;
  n: bigint;
  phi: bigint;
  lhs: bigint; // a^phi mod n or a^(n-1) mod n
  expected: bigint;
}

/**
 * Checks Euler's theorem: a^φ(n) ≡ 1 (mod n) for gcd(a, n) = 1
 */
export function checkEulerTheorem(a: bigint, n: bigint): TheoremCheckResult {
  if (n <= 1n) {
    throw new Error('Modulus must be greater than 1');
  }
  if (a <= 0n) {
    throw new Error('Base must be positive');
  }

  const { value: phi } = totient(n);
  const { result: g } = gcd(a, n);

  if (g !== 1n) {
    return {
      holds: false,
      a,
      n,
      phi,
      lhs: 0n,
      expected: 1n,
    };
  }

  const { result: lhs } = modExp(a, phi, n);
  return {
    holds: lhs === 1n,
    a,
    n,
    phi,
    lhs,
    expected: 1n,
  };
}

/**
 * Checks Fermat's Little Theorem: a^(p-1) ≡ 1 (mod p) for prime p and a not divisible by p
 */
export function checkFermatLittle(a: bigint, p: bigint): TheoremCheckResult {
  if (p <= 2n) {
    throw new Error('Prime must be greater than 2');
  }
  if (a <= 0n) {
    throw new Error('Base must be positive');
  }

  const phi = p - 1n;
  const { result: g } = gcd(a, p);

  if (g !== 1n) {
    return {
      holds: false,
      a,
      n: p,
      phi,
      lhs: 0n,
      expected: 1n,
    };
  }

  const { result: lhs } = modExp(a, phi, p);
  return {
    holds: lhs === 1n,
    a,
    n: p,
    phi,
    lhs,
    expected: 1n,
  };
}

/**
 * Checks Euler's theorem specifically for n = p*q (RSA modulus)
 */
export function checkEulerForRSA(a: bigint, p: bigint, q: bigint): TheoremCheckResult {
  if (p <= 1n || q <= 1n) {
    throw new Error('Primes must be greater than 1');
  }
  if (p === q) {
    throw new Error('Primes must be distinct');
  }
  if (a <= 0n) {
    throw new Error('Base must be positive');
  }

  const n = p * q;
  const { value: phi } = totientPrimeProduct(p, q);
  const { result: g } = gcd(a, n);

  if (g !== 1n) {
    return {
      holds: false,
      a,
      n,
      phi,
      lhs: 0n,
      expected: 1n,
    };
  }

  const { result: lhs } = modExp(a, phi, n);
  return {
    holds: lhs === 1n,
    a,
    n,
    phi,
    lhs,
    expected: 1n,
  };
}
