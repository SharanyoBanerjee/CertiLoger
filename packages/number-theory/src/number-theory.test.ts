import { describe, it, expect } from 'vitest';
import { gcd, extendedGcd, modInverse } from './index.js';

function modEq(a: bigint, b: bigint, m: bigint): boolean {
  return ((a % m) + m) % m === ((b % m) + m) % m;
}

describe('gcd', () => {
  it('gcd(12, 18) = 6', () => {
    const { result, steps } = gcd(12n, 18n);
    expect(result).toBe(6n);
    expect(steps).toHaveLength(2);
    expect(steps[0]).toEqual({ a: 18n, b: 12n, q: 1n, r: 6n });
    expect(steps[1]).toEqual({ a: 12n, b: 6n, q: 2n, r: 0n });
  });

  it('gcd(17, 3120) = 1', () => {
    const { result, steps } = gcd(17n, 3120n);
    expect(result).toBe(1n);
    expect(steps.length).toBeGreaterThan(0);
    expect(steps[steps.length - 1].r).toBe(0n);
  });

  it('handles negative inputs', () => {
    const { result } = gcd(-12n, 18n);
    expect(result).toBe(6n);
    const { result: r2 } = gcd(12n, -18n);
    expect(r2).toBe(6n);
    const { result: r3 } = gcd(-12n, -18n);
    expect(r3).toBe(6n);
  });

  it('handles large values', () => {
    // gcd(12345678901234567890, 98765432109876543210)
    // 98765432109876543210 = 12345678901234567890 * 8 + 12345678901234567890 * 0?
    // Let me compute: 98765432109876543210 / 12345678901234567890 = 8, remainder = 98765432109876543210 - 8*12345678901234567890 = 98765432109876543210 - 98765431209876543120 = 900000000090
    // gcd(12345678901234567890, 900000000090)
    // 12345678901234567890 / 900000000090 = 13717421, remainder = 0
    // So gcd = 900000000090
    const { result } = gcd(12345678901234567890n, 98765432109876543210n);
    expect(result).toBe(900000000090n);
  });

  it('gcd(a, 0) = |a|', () => {
    expect(gcd(42n, 0n).result).toBe(42n);
    expect(gcd(-42n, 0n).result).toBe(42n);
    expect(gcd(0n, 0n).result).toBe(0n);
  });
});

describe('extendedGcd', () => {
  it('17 * x + 3120 * y = 1', () => {
    const { gcd, x, y } = extendedGcd(17n, 3120n);
    expect(gcd).toBe(1n);
    expect(17n * x + 3120n * y).toBe(1n);
  });

  it('12 * x + 18 * y = 6', () => {
    const { gcd, x, y } = extendedGcd(12n, 18n);
    expect(gcd).toBe(6n);
    expect(12n * x + 18n * y).toBe(6n);
  });

  it('handles negative inputs (equation uses absolute values)', () => {
    const { gcd, x, y } = extendedGcd(-12n, 18n);
    expect(gcd).toBe(6n);
    // The algorithm uses absolute values internally, so the equation is 12*x + 18*y = 6
    expect(12n * x + 18n * y).toBe(6n);
  });

  it('returns steps matching gcd', () => {
    const { steps } = extendedGcd(17n, 3120n);
    const { steps: gcdSteps } = gcd(17n, 3120n);
    expect(steps).toEqual(gcdSteps);
  });
});

describe('modInverse', () => {
  it('inverse of 17 mod 3120 = 2753', () => {
    const inv = modInverse(17n, 3120n);
    expect(inv).toBe(2753n);
    expect(modEq(17n * 2753n, 1n, 3120n)).toBe(true);
  });

  it('returns null when gcd != 1', () => {
    expect(modInverse(12n, 18n)).toBeNull();
    expect(modInverse(6n, 9n)).toBeNull();
  });

  it('handles negative a', () => {
    const inv = modInverse(-17n, 3120n);
    expect(inv).toBe(367n); // 3120 - 2753 = 367
    expect(modEq(-17n * 367n, 1n, 3120n)).toBe(true);
  });

  it('throws on non-positive modulus', () => {
    expect(() => modInverse(17n, 0n)).toThrow('Modulus must be positive');
    expect(() => modInverse(17n, -5n)).toThrow('Modulus must be positive');
  });

  it('works with large values', () => {
    const inv = modInverse(123456789n, 9876543211n);
    expect(inv).not.toBeNull();
    if (inv !== null) {
      expect(modEq(123456789n * inv, 1n, 9876543211n)).toBe(true);
    }
  });

  it('inverse of 1 is 1', () => {
    expect(modInverse(1n, 7n)).toBe(1n);
  });

  it('inverse of 0 does not exist', () => {
    expect(modInverse(0n, 7n)).toBeNull();
  });
});
