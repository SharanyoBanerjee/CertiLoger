export interface ModExpStep {
  step: number;
  bit: number;
  base: bigint;
  result: bigint;
  action: 'square' | 'multiply' | 'init';
}

export interface ModExpResult {
  result: bigint;
  steps: ModExpStep[];
}

/**
 * Fast modular exponentiation using repeated squaring.
 * Returns both the result and a step table for educational display.
 * Time complexity: O(log exp) multiplications.
 */
export function modExp(base: bigint, exp: bigint, mod: bigint): ModExpResult {
  if (mod <= 0n) {
    throw new Error('Modulus must be positive');
  }
  if (exp < 0n) {
    throw new Error('Exponent must be non-negative');
  }

  let result = 1n % mod;
  let currentBase = base % mod;
  let currentExp = exp;
  let stepNum = 0;
  const steps: ModExpStep[] = [];

  // Initial state
  steps.push({
    step: stepNum++,
    bit: -1,
    base: currentBase,
    result,
    action: 'init',
  });

  while (currentExp > 0n) {
    const bit = currentExp & 1n;

    if (bit === 1n) {
      // Multiply result by current base
      result = (result * currentBase) % mod;
      steps.push({
        step: stepNum++,
        bit: 1,
        base: currentBase,
        result,
        action: 'multiply',
      });
    }

    currentExp >>= 1n;

    if (currentExp > 0n) {
      // Square the base for next bit
      currentBase = (currentBase * currentBase) % mod;
      steps.push({
        step: stepNum++,
        bit: 0,
        base: currentBase,
        result,
        action: 'square',
      });
    }
  }

  return { result, steps };
}
