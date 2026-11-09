// Number theory package - algorithms will be added in commits 3, 4, 7
// Pure TypeScript, no dependencies. Educational use only.

export { gcd, type GcdResult, type GcdStep } from './gcd.js';
export { extendedGcd, type ExtendedGcdResult } from './extendedGcd.js';
export { modInverse } from './modInverse.js';

export function totient(_n: bigint): bigint {
  throw new Error('Not implemented - commit 4');
}

export function modExp(_base: bigint, _exp: bigint, _mod: bigint): bigint {
  throw new Error('Not implemented - commit 4');
}

export function isPrimeTrial(_n: bigint): boolean {
  throw new Error('Not implemented - commit 7');
}

export function millerRabin(_n: bigint, _rounds?: number): boolean {
  throw new Error('Not implemented - commit 7');
}

export function toyRsaGenerate(
  _p: bigint,
  _q: bigint,
  _e: bigint
): { n: bigint; phi: bigint; d: bigint } {
  throw new Error('Not implemented - commit 7');
}

export function toyRsaSign(_m: bigint, _d: bigint, _n: bigint): bigint {
  throw new Error('Not implemented - commit 7');
}

export function toyRsaVerify(_s: bigint, _e: bigint, _n: bigint): bigint {
  throw new Error('Not implemented - commit 7');
}
