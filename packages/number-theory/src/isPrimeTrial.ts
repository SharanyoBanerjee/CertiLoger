export interface PrimeTrialResult {
  isPrime: boolean;
  steps: { divisor: bigint; divides: boolean }[];
}

/**
 * Trial division primality test.
 * Returns true if n is prime, false otherwise.
 * Includes step table for educational display.
 */
export function isPrimeTrial(n: bigint): PrimeTrialResult {
  if (n <= 1n) {
    return { isPrime: false, steps: [] };
  }
  if (n === 2n || n === 3n) {
    return { isPrime: true, steps: [] };
  }
  if (n % 2n === 0n) {
    return { isPrime: false, steps: [{ divisor: 2n, divides: true }] };
  }

  const steps: { divisor: bigint; divides: boolean }[] = [];
  for (let d = 3n; d * d <= n; d += 2n) {
    const divides = n % d === 0n;
    steps.push({ divisor: d, divides });
    if (divides) {
      return { isPrime: false, steps };
    }
  }

  return { isPrime: true, steps };
}
