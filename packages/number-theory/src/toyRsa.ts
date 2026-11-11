import { modInverse } from './modInverse.js';
import { modExp } from './modExp.js';
import { isPrimeTrial } from './isPrimeTrial.js';

export interface ToyRsaKeys {
  n: bigint;
  phi: bigint;
  e: bigint;
  d: bigint;
}

export interface ToyRsaResult {
  result: bigint;
  steps: { step: string; value: bigint }[];
}

/**
 * Generate toy RSA keys from two primes and a public exponent.
 * Returns n, φ(n), e, d where e*d ≡ 1 (mod φ(n)).
 */
export function toyRsaGenerate(p: bigint, q: bigint, e: bigint): ToyRsaKeys {
  if (p <= 1n || q <= 1n) {
    throw new Error('Primes must be greater than 1');
  }
  if (p === q) {
    throw new Error('Primes must be distinct');
  }

  // Verify p and q are prime (educational check)
  const pPrime = isPrimeTrial(p);
  const qPrime = isPrimeTrial(q);
  if (!pPrime.isPrime || !qPrime.isPrime) {
    throw new Error('Inputs must be prime');
  }

  const n = p * q;
  const phi = (p - 1n) * (q - 1n);

  if (e <= 1n || e >= phi) {
    throw new Error('Public exponent must be in (1, φ(n))');
  }

  const d = modInverse(e, phi);
  if (d === null) {
    throw new Error('e and φ(n) must be coprime');
  }

  return { n, phi, e, d };
}

/**
 * Toy RSA sign: compute m^d mod n (textbook RSA, no padding).
 */
export function toyRsaSign(m: bigint, d: bigint, n: bigint): ToyRsaResult {
  if (m < 0n || m >= n) {
    throw new Error('Message must be in [0, n)');
  }

  const steps: { step: string; value: bigint }[] = [];
  steps.push({ step: 'input', value: m });

  const { result, steps: modExpSteps } = modExp(m, d, n);
  steps.push({ step: 'compute m^d mod n', value: result });

  for (const s of modExpSteps) {
    steps.push({ step: `modExp: ${s.action} (bit ${s.bit})`, value: s.result });
  }

  return { result, steps };
}

/**
 * Toy RSA verify: compute s^e mod n (textbook RSA, no padding).
 */
export function toyRsaVerify(s: bigint, e: bigint, n: bigint): ToyRsaResult {
  if (s < 0n || s >= n) {
    throw new Error('Signature must be in [0, n)');
  }

  const steps: { step: string; value: bigint }[] = [];
  steps.push({ step: 'input', value: s });

  const { result, steps: modExpSteps } = modExp(s, e, n);
  steps.push({ step: 'compute s^e mod n', value: result });

  for (const s2 of modExpSteps) {
    steps.push({ step: `modExp: ${s2.action} (bit ${s2.bit})`, value: s2.result });
  }

  return { result, steps };
}
