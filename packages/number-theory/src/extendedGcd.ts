import type { GcdStep } from './gcd.js';

export interface ExtendedGcdResult {
  gcd: bigint;
  x: bigint;
  y: bigint;
  steps: GcdStep[];
}

function ensurePositive(n: bigint): bigint {
  return n < 0n ? -n : n;
}

export function extendedGcd(a: bigint, b: bigint): ExtendedGcdResult {
  let x = ensurePositive(a);
  let y = ensurePositive(b);

  let swapped = false;
  if (x < y) {
    [x, y] = [y, x];
    swapped = true;
  }

  let oldR = x,
    r = y;
  let oldS = 1n,
    s = 0n;
  let oldT = 0n,
    t = 1n;
  const steps: GcdStep[] = [];

  while (r !== 0n) {
    const q = oldR / r;
    const remainder = oldR % r;
    steps.push({ a: oldR, b: r, q, r: remainder });

    [oldR, r] = [r, remainder];
    [oldS, s] = [s, oldS - q * s];
    [oldT, t] = [t, oldT - q * t];
  }

  // If we swapped inputs, swap coefficients back
  let finalX = oldS;
  let finalY = oldT;
  if (swapped) {
    [finalX, finalY] = [finalY, finalX];
  }

  return { gcd: oldR, x: finalX, y: finalY, steps };
}
