import { Router } from 'express';
import { z } from 'zod';
import {
  gcd,
  extendedGcd,
  modInverse,
  totient,
  totientPrimeProduct,
  modExp,
  isPrimeTrial,
  millerRabin,
  toyRsaGenerate,
  toyRsaSign,
  toyRsaVerify,
} from '@certiledger/number-theory';
import { validate } from '../middleware/validate.js';

const router = Router();

// Helper to convert BigInt to string in JSON
function bigIntToString(obj: unknown): unknown {
  if (typeof obj === 'bigint') {
    return obj.toString();
  }
  if (Array.isArray(obj)) {
    return obj.map(bigIntToString);
  }
  if (obj && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = bigIntToString(value);
    }
    return result;
  }
  return obj;
}

// GCD endpoint
const gcdSchema = z.object({
  body: z.object({
    a: z.string().transform((s) => BigInt(s)),
    b: z.string().transform((s) => BigInt(s)),
  }),
});

router.post('/gcd', validate(gcdSchema), async (req, res, next) => {
  try {
    const { a, b } = req.body;
    const result = gcd(a, b);
    res.json(bigIntToString(result));
  } catch (err) {
    next(err);
  }
});

// Extended GCD endpoint
const extendedGcdSchema = z.object({
  body: z.object({
    a: z.string().transform((s) => BigInt(s)),
    b: z.string().transform((s) => BigInt(s)),
  }),
});

router.post('/extended-gcd', validate(extendedGcdSchema), async (req, res, next) => {
  try {
    const { a, b } = req.body;
    const result = extendedGcd(a, b);
    res.json(bigIntToString(result));
  } catch (err) {
    next(err);
  }
});

// Modular inverse endpoint
const modInverseSchema = z.object({
  body: z.object({
    a: z.string().transform((s) => BigInt(s)),
    n: z.string().transform((s) => BigInt(s)),
  }),
});

router.post('/mod-inverse', validate(modInverseSchema), async (req, res, next) => {
  try {
    const { a, n } = req.body;
    const result = modInverse(a, n);
    res.json({ inverse: result ? result.toString() : null });
  } catch (err) {
    next(err);
  }
});

// Totient (general) endpoint
const totientSchema = z.object({
  body: z.object({
    n: z.string().transform((s) => BigInt(s)),
  }),
});

router.post('/totient', validate(totientSchema), async (req, res, next) => {
  try {
    const { n } = req.body;
    const result = totient(n);
    res.json(bigIntToString(result));
  } catch (err) {
    next(err);
  }
});

// Totient (prime product) endpoint
const totientPrimeProductSchema = z.object({
  body: z.object({
    p: z.string().transform((s) => BigInt(s)),
    q: z.string().transform((s) => BigInt(s)),
  }),
});

router.post(
  '/totient-prime-product',
  validate(totientPrimeProductSchema),
  async (req, res, next) => {
    try {
      const { p, q } = req.body;
      const result = totientPrimeProduct(p, q);
      res.json(bigIntToString(result));
    } catch (err) {
      next(err);
    }
  }
);

// Modular exponentiation endpoint
const modExpSchema = z.object({
  body: z.object({
    base: z.string().transform((s) => BigInt(s)),
    exp: z.string().transform((s) => BigInt(s)),
    mod: z.string().transform((s) => BigInt(s)),
  }),
});

router.post('/mod-exp', validate(modExpSchema), async (req, res, next) => {
  try {
    const { base, exp, mod } = req.body;
    const result = modExp(base, exp, mod);
    res.json(bigIntToString(result));
  } catch (err) {
    next(err);
  }
});

// Primality test (trial division) endpoint
const isPrimeTrialSchema = z.object({
  body: z.object({
    n: z.string().transform((s) => BigInt(s)),
  }),
});

router.post('/is-prime', validate(isPrimeTrialSchema), async (req, res, next) => {
  try {
    const { n } = req.body;
    const result = isPrimeTrial(n);
    res.json(bigIntToString(result));
  } catch (err) {
    next(err);
  }
});

// Primality test (Miller-Rabin) endpoint
const millerRabinSchema = z.object({
  body: z.object({
    n: z.string().transform((s) => BigInt(s)),
    rounds: z.coerce.number().int().positive().max(100).optional().default(20),
  }),
});

router.post('/miller-rabin', validate(millerRabinSchema), async (req, res, next) => {
  try {
    const { n, rounds } = req.body;
    const result = millerRabin(n, rounds);
    res.json(bigIntToString(result));
  } catch (err) {
    next(err);
  }
});

// Toy RSA key generation endpoint
const toyRsaGenerateSchema = z.object({
  body: z.object({
    p: z.string().transform((s) => BigInt(s)),
    q: z.string().transform((s) => BigInt(s)),
    e: z.string().transform((s) => BigInt(s)),
  }),
});

router.post('/toy-rsa/generate', validate(toyRsaGenerateSchema), async (req, res, next) => {
  try {
    const { p, q, e } = req.body;
    const result = toyRsaGenerate(p, q, e);
    res.json(bigIntToString(result));
  } catch (err) {
    next(err);
  }
});

// Toy RSA sign endpoint
const toyRsaSignSchema = z.object({
  body: z.object({
    m: z.string().transform((s) => BigInt(s)),
    d: z.string().transform((s) => BigInt(s)),
    n: z.string().transform((s) => BigInt(s)),
  }),
});

router.post('/toy-rsa/sign', validate(toyRsaSignSchema), async (req, res, next) => {
  try {
    const { m, d, n } = req.body;
    const result = toyRsaSign(m, d, n);
    res.json(bigIntToString(result));
  } catch (err) {
    next(err);
  }
});

// Toy RSA verify endpoint
const toyRsaVerifySchema = z.object({
  body: z.object({
    s: z.string().transform((s) => BigInt(s)),
    e: z.string().transform((s) => BigInt(s)),
    n: z.string().transform((s) => BigInt(s)),
  }),
});

router.post('/toy-rsa/verify', validate(toyRsaVerifySchema), async (req, res, next) => {
  try {
    const { s, e, n } = req.body;
    const result = toyRsaVerify(s, e, n);
    res.json(bigIntToString(result));
  } catch (err) {
    next(err);
  }
});

export default router;
