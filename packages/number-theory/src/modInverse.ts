import { extendedGcd } from './extendedGcd.js';

export function modInverse(a: bigint, n: bigint): bigint | null {
  if (n <= 0n) {
    throw new Error('Modulus must be positive');
  }

  const normalizedA = ((a % n) + n) % n;
  const { gcd, x } = extendedGcd(normalizedA, n);

  if (gcd !== 1n) {
    return null;
  }

  return ((x % n) + n) % n;
}
