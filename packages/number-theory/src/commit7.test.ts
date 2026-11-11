import { describe, it, expect } from 'vitest';
import { isPrimeTrial, millerRabin, toyRsaGenerate, toyRsaSign, toyRsaVerify } from './index.js';

describe('isPrimeTrial', () => {
  it('returns false for 0 and 1', () => {
    expect(isPrimeTrial(0n).isPrime).toBe(false);
    expect(isPrimeTrial(1n).isPrime).toBe(false);
  });

  it('returns true for small primes', () => {
    expect(isPrimeTrial(2n).isPrime).toBe(true);
    expect(isPrimeTrial(3n).isPrime).toBe(true);
    expect(isPrimeTrial(5n).isPrime).toBe(true);
    expect(isPrimeTrial(7n).isPrime).toBe(true);
    expect(isPrimeTrial(13n).isPrime).toBe(true);
    expect(isPrimeTrial(97n).isPrime).toBe(true);
  });

  it('returns false for composites', () => {
    expect(isPrimeTrial(4n).isPrime).toBe(false);
    expect(isPrimeTrial(6n).isPrime).toBe(false);
    expect(isPrimeTrial(9n).isPrime).toBe(false);
    expect(isPrimeTrial(15n).isPrime).toBe(false);
    expect(isPrimeTrial(100n).isPrime).toBe(false);
  });

  it('returns false for even numbers > 2', () => {
    expect(isPrimeTrial(10n).isPrime).toBe(false);
    expect(isPrimeTrial(100n).isPrime).toBe(false);
  });

  it('includes step table', () => {
    const result = isPrimeTrial(15n);
    expect(result.steps.length).toBeGreaterThan(0);
    expect(result.steps[0].divides).toBe(true); // 3 divides 15
  });
});

describe('millerRabin', () => {
  it('returns false for 0 and 1', () => {
    expect(millerRabin(0n).isProbablyPrime).toBe(false);
    expect(millerRabin(1n).isProbablyPrime).toBe(false);
  });

  it('returns true for small primes', () => {
    expect(millerRabin(2n).isProbablyPrime).toBe(true);
    expect(millerRabin(3n).isProbablyPrime).toBe(true);
    expect(millerRabin(5n).isProbablyPrime).toBe(true);
    expect(millerRabin(7n).isProbablyPrime).toBe(true);
    expect(millerRabin(13n).isProbablyPrime).toBe(true);
    expect(millerRabin(97n).isProbablyPrime).toBe(true);
  });

  it('returns false for composites', () => {
    expect(millerRabin(4n).isProbablyPrime).toBe(false);
    expect(millerRabin(6n).isProbablyPrime).toBe(false);
    expect(millerRabin(9n).isProbablyPrime).toBe(false);
    expect(millerRabin(15n).isProbablyPrime).toBe(false);
    expect(millerRabin(100n).isProbablyPrime).toBe(false);
  });

  it('catches Carmichael number 561', () => {
    // 561 = 3 * 11 * 17 is a Carmichael number
    // Fermat test would be fooled, but Miller-Rabin catches it
    const result = millerRabin(561n, 10);
    expect(result.isProbablyPrime).toBe(false);
  });

  it('handles larger primes', () => {
    // 1009 is prime
    expect(millerRabin(1009n, 10).isProbablyPrime).toBe(true);
    // 1013 is prime
    expect(millerRabin(1013n, 10).isProbablyPrime).toBe(true);
  });

  it('includes witnesses and steps', () => {
    const result = millerRabin(17n, 5);
    expect(result.witnesses.length).toBeLessThanOrEqual(5);
    expect(result.steps.length).toBeGreaterThan(0);
  });
});

describe('toyRsaGenerate', () => {
  it('reproduces textbook example p=61, q=53, e=17', () => {
    const keys = toyRsaGenerate(61n, 53n, 17n);
    expect(keys.n).toBe(3233n);
    expect(keys.phi).toBe(3120n);
    expect(keys.e).toBe(17n);
    expect(keys.d).toBe(2753n);
    // Verify e*d ≡ 1 (mod φ)
    expect((17n * 2753n) % 3120n).toBe(1n);
  });

  it('throws on non-prime p', () => {
    expect(() => toyRsaGenerate(4n, 53n, 17n)).toThrow('Inputs must be prime');
  });

  it('throws on non-prime q', () => {
    expect(() => toyRsaGenerate(61n, 4n, 17n)).toThrow('Inputs must be prime');
  });

  it('throws on equal primes', () => {
    expect(() => toyRsaGenerate(61n, 61n, 17n)).toThrow('Primes must be distinct');
  });

  it('throws on e out of range', () => {
    expect(() => toyRsaGenerate(61n, 53n, 0n)).toThrow('Public exponent must be in');
    expect(() => toyRsaGenerate(61n, 53n, 3120n)).toThrow('Public exponent must be in');
  });

  it('throws when e not coprime to phi', () => {
    // e=2 shares factor with φ(61*53)=3120
    expect(() => toyRsaGenerate(61n, 53n, 2n)).toThrow('must be coprime');
  });
});

describe('toyRsaSign', () => {
  it('65^2753 mod 3233 = 588 (textbook example)', () => {
    const result = toyRsaSign(65n, 2753n, 3233n);
    expect(result.result).toBe(588n);
  });

  it('includes steps', () => {
    const result = toyRsaSign(65n, 2753n, 3233n);
    expect(result.steps.length).toBeGreaterThan(0);
  });

  it('throws on message out of range', () => {
    expect(() => toyRsaSign(-1n, 2753n, 3233n)).toThrow('Message must be in');
    expect(() => toyRsaSign(3233n, 2753n, 3233n)).toThrow('Message must be in');
  });
});

describe('toyRsaVerify', () => {
  it('588^17 mod 3233 = 65 (textbook example)', () => {
    const result = toyRsaVerify(588n, 17n, 3233n);
    expect(result.result).toBe(65n);
  });

  it('includes steps', () => {
    const result = toyRsaVerify(588n, 17n, 3233n);
    expect(result.steps.length).toBeGreaterThan(0);
  });

  it('throws on signature out of range', () => {
    expect(() => toyRsaVerify(-1n, 17n, 3233n)).toThrow('Signature must be in');
    expect(() => toyRsaVerify(3233n, 17n, 3233n)).toThrow('Signature must be in');
  });
});

describe('toy RSA round trip', () => {
  it('sign then verify returns original message', () => {
    const keys = toyRsaGenerate(61n, 53n, 17n);
    const message = 65n;
    const signed = toyRsaSign(message, keys.d, keys.n);
    const verified = toyRsaVerify(signed.result, keys.e, keys.n);
    expect(verified.result).toBe(message);
  });

  it('works with different messages', () => {
    const keys = toyRsaGenerate(61n, 53n, 17n);
    for (const m of [1n, 2n, 10n, 100n, 1000n, 2000n, 3232n]) {
      const signed = toyRsaSign(m, keys.d, keys.n);
      const verified = toyRsaVerify(signed.result, keys.e, keys.n);
      expect(verified.result).toBe(m);
    }
  });
});
