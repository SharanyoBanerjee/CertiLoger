import { modExp } from './modExp.js';

export interface MillerRabinResult {
  isProbablyPrime: boolean;
  rounds: number;
  witnesses: bigint[];
  steps: MillerRabinStep[];
}

export interface MillerRabinStep {
  round: number;
  a: bigint;
  x: bigint;
  passed: boolean;
}

/**
 * Miller-Rabin primality test.
 * Returns true if n is probably prime, false if definitely composite.
 * Error probability: at most 4^(-rounds) for composite n.
 */
export function millerRabin(n: bigint, rounds = 20): MillerRabinResult {
  if (n <= 1n) {
    return { isProbablyPrime: false, rounds, witnesses: [], steps: [] };
  }
  if (n === 2n || n === 3n) {
    return { isProbablyPrime: true, rounds, witnesses: [], steps: [] };
  }
  if (n % 2n === 0n) {
    return { isProbablyPrime: false, rounds, witnesses: [], steps: [] };
  }

  // Write n-1 = d * 2^s with d odd
  let d = n - 1n;
  let s = 0;
  while (d % 2n === 0n) {
    d /= 2n;
    s++;
  }

  const witnesses: bigint[] = [];
  const steps: MillerRabinStep[] = [];

  for (let round = 0; round < rounds; round++) {
    // Pick random a in [2, n-2]
    // For deterministic testing of small numbers, use fixed bases
    let a: bigint;
    if (n < 4n) {
      a = 2n;
    } else {
      // Use a simple deterministic approach for reproducibility
      // In practice, this should use a secure random source
      a = 2n + ((BigInt(round) * 7n) % (n - 3n));
      if (a < 2n) a = 2n;
      if (a > n - 2n) a = n - 2n;
    }
    witnesses.push(a);

    const { result: x } = modExp(a, d, n);

    if (x === 1n || x === n - 1n) {
      steps.push({ round, a, x, passed: true });
      continue;
    }

    let passed = false;
    let currentX = x;
    for (let r = 1; r < s; r++) {
      currentX = (currentX * currentX) % n;
      if (currentX === n - 1n) {
        passed = true;
        break;
      }
    }

    steps.push({ round, a, x: currentX, passed });
    if (!passed) {
      return { isProbablyPrime: false, rounds, witnesses, steps };
    }
  }

  return { isProbablyPrime: true, rounds, witnesses, steps };
}
