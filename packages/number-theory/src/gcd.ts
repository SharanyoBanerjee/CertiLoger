export interface GcdStep {
  a: bigint;
  b: bigint;
  q: bigint;
  r: bigint;
}

export interface GcdResult {
  result: bigint;
  steps: GcdStep[];
}

function ensurePositive(n: bigint): bigint {
  return n < 0n ? -n : n;
}

export function gcd(a: bigint, b: bigint): GcdResult {
  let x = ensurePositive(a);
  let y = ensurePositive(b);

  // Ensure x >= y for standard Euclidean algorithm
  if (x < y) {
    [x, y] = [y, x];
  }

  const steps: GcdStep[] = [];

  while (y !== 0n) {
    const q = x / y;
    const r = x % y;
    steps.push({ a: x, b: y, q, r });
    x = y;
    y = r;
  }

  return { result: x, steps };
}
