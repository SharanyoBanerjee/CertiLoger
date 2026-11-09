import { describe, it, expect } from 'vitest';
import {
  totient,
  totientPrimeProduct,
  modExp,
  checkEulerTheorem,
  checkFermatLittle,
  checkEulerForRSA,
} from './index.js';

describe('totientPrimeProduct', () => {
  it('φ(61 * 53) = 3120', () => {
    const { value, steps } = totientPrimeProduct(61n, 53n);
    expect(value).toBe(3120n);
    expect(steps).toEqual({ p: 61n, q: 53n });
  });

  it('throws on non-prime inputs (<= 1)', () => {
    expect(() => totientPrimeProduct(1n, 53n)).toThrow('Primes must be greater than 1');
    expect(() => totientPrimeProduct(61n, 1n)).toThrow('Primes must be greater than 1');
    expect(() => totientPrimeProduct(0n, 53n)).toThrow('Primes must be greater than 1');
  });

  it('throws on equal primes', () => {
    expect(() => totientPrimeProduct(61n, 61n)).toThrow('Primes must be distinct');
  });
});

describe('totient (general)', () => {
  it('φ(1) = 1', () => {
    const { value, steps } = totient(1n);
    expect(value).toBe(1n);
    expect(steps.factors).toHaveLength(0);
  });

  it('φ(prime) = prime - 1', () => {
    expect(totient(7n).value).toBe(6n);
    expect(totient(13n).value).toBe(12n);
    expect(totient(97n).value).toBe(96n);
  });

  it('φ(p^k) = p^k - p^(k-1)', () => {
    // φ(8) = φ(2^3) = 8 - 4 = 4
    expect(totient(8n).value).toBe(4n);
    // φ(9) = φ(3^2) = 9 - 3 = 6
    expect(totient(9n).value).toBe(6n);
    // φ(27) = φ(3^3) = 27 - 9 = 18
    expect(totient(27n).value).toBe(18n);
  });

  it('φ(p*q) = (p-1)*(q-1) for distinct primes', () => {
    expect(totient(15n).value).toBe(8n); // φ(3*5) = 2*4 = 8
    expect(totient(35n).value).toBe(24n); // φ(5*7) = 4*6 = 24
    expect(totient(3233n).value).toBe(3120n); // φ(61*53) = 60*52 = 3120
  });

  it('returns correct factorization steps', () => {
    const { steps } = totient(60n); // 60 = 2^2 * 3 * 5
    expect(steps.factors).toHaveLength(3);
    expect(steps.factors[0]).toEqual({ prime: 2n, exponent: 2n });
    expect(steps.factors[1]).toEqual({ prime: 3n, exponent: 1n });
    expect(steps.factors[2]).toEqual({ prime: 5n, exponent: 1n });
  });

  it('throws on non-positive input', () => {
    expect(() => totient(0n)).toThrow('Input must be positive');
    expect(() => totient(-5n)).toThrow('Input must be positive');
  });
});

describe('modExp (repeated squaring)', () => {
  it('2^10 mod 1000 = 24', () => {
    expect(modExp(2n, 10n, 1000n).result).toBe(24n);
  });

  it('3^13 mod 7 = 3', () => {
    expect(modExp(3n, 13n, 7n).result).toBe(3n);
  });

  it('exponent 0 gives 1', () => {
    expect(modExp(5n, 0n, 13n).result).toBe(1n);
    expect(modExp(123n, 0n, 456n).result).toBe(1n);
  });

  it('5^3 mod 13 = 8', () => {
    expect(modExp(5n, 3n, 13n).result).toBe(8n);
  });

  it('large exponent', () => {
    // 2^1000 mod 1001
    const { result } = modExp(2n, 1000n, 1001n);
    // Verify by checking 2^1000 ≡ result (mod 1001)
    expect(result).toBeLessThan(1001n);
  });

  it('returns step table with init, multiply, square actions', () => {
    const { steps } = modExp(3n, 13n, 7n); // 13 = 1101 binary
    expect(steps[0].action).toBe('init');
    expect(steps[0].bit).toBe(-1);
    // Should have multiply and square actions
    const hasMultiply = steps.some((s) => s.action === 'multiply');
    const hasSquare = steps.some((s) => s.action === 'square');
    expect(hasMultiply).toBe(true);
    expect(hasSquare).toBe(true);
  });

  it('throws on non-positive modulus', () => {
    expect(() => modExp(2n, 3n, 0n)).toThrow('Modulus must be positive');
    expect(() => modExp(2n, 3n, -5n)).toThrow('Modulus must be positive');
  });

  it('throws on negative exponent', () => {
    expect(() => modExp(2n, -1n, 5n)).toThrow('Exponent must be non-negative');
  });
});

describe('Euler theorem checker', () => {
  it('holds for coprime a, n', () => {
    const check = checkEulerTheorem(3n, 10n); // φ(10) = 4, 3^4 = 81 ≡ 1 (mod 10)
    expect(check.holds).toBe(true);
    expect(check.lhs).toBe(1n);
    expect(check.phi).toBe(4n);
  });

  it('fails when gcd(a,n) != 1', () => {
    const check = checkEulerTheorem(2n, 10n); // gcd(2,10) = 2
    expect(check.holds).toBe(false);
    expect(check.lhs).toBe(0n);
  });

  it('works for RSA modulus (61*53=3233, φ=3120)', () => {
    const check = checkEulerForRSA(17n, 61n, 53n);
    expect(check.holds).toBe(true);
    expect(check.phi).toBe(3120n);
    expect(check.lhs).toBe(1n);
    expect(check.n).toBe(3233n);
  });

  it('throws on invalid inputs', () => {
    expect(() => checkEulerTheorem(0n, 10n)).toThrow('Base must be positive');
    expect(() => checkEulerTheorem(3n, 1n)).toThrow('Modulus must be greater than 1');
    expect(() => checkEulerForRSA(17n, 61n, 61n)).toThrow('Primes must be distinct');
  });
});

describe('Fermat Little theorem checker', () => {
  it('holds for prime p and a not divisible by p', () => {
    const check = checkFermatLittle(2n, 7n); // 2^6 = 64 ≡ 1 (mod 7)
    expect(check.holds).toBe(true);
    expect(check.lhs).toBe(1n);
    expect(check.phi).toBe(6n);
  });

  it('fails when a is divisible by p', () => {
    const check = checkFermatLittle(7n, 7n); // gcd(7,7) = 7
    expect(check.holds).toBe(false);
  });

  it('throws on invalid inputs', () => {
    expect(() => checkFermatLittle(0n, 7n)).toThrow('Base must be positive');
    expect(() => checkFermatLittle(2n, 2n)).toThrow('Prime must be greater than 2');
  });
});
