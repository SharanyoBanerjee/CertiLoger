import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';

// Set environment variables using vi.hoisted to run before imports
vi.hoisted(() => {
  process.env.DATABASE_URL = 'postgresql://certiledger:certiledger@localhost:5432/certiledger';
  process.env.JWT_SECRET = 'test-secret-key-for-testing-only-32chars';
  process.env.BASE_URL = 'http://localhost:5173';
  process.env.KEYS_DIR = './keys';
  process.env.STORAGE_DIR = './storage';
  process.env.LEDGER_DRIVER = 'local';
  process.env.NODE_ENV = 'test';
  process.env.PORT = '3000';
});

import request from 'supertest';
import express from 'express';
import { PrismaClient, type Role } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import authRouter from '../src/routes/auth.js';
import institutionRouter from '../src/routes/institutions.js';
import keysRouter from '../src/routes/keys.js';
import { errorHandler } from '../src/middleware/errorHandler.js';

const prisma = new PrismaClient();
const JWT_SECRET = 'test-secret-key-for-testing-only-32chars';

const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);
app.use('/api/institutions', institutionRouter);
app.use('/api/keys', keysRouter);
app.use(errorHandler);

let netAdminToken: string;
let instAdminToken: string;
let instAdminBToken: string;
let issuerToken: string;
let holderToken: string;
let instAId: string;
let instBId: string;

async function createTestUser(role: string, institutionId?: string, emailSuffix?: string) {
  const passwordHash = await bcrypt.hash('password123', 10);
  const suffix = emailSuffix ? `_${emailSuffix}` : '';
  const email = `${role.toLowerCase()}${suffix}@test.test`;
  return prisma.user.upsert({
    where: { email },
    update: { role: role as Role, institutionId, passwordHash },
    create: {
      id: `user-${role.toLowerCase()}${suffix}`,
      name: `Test ${role}${suffix ? ` ${suffix}` : ''}`,
      email,
      passwordHash,
      role: role as Role,
      institutionId,
    },
  });
}

function makeToken(user: {
  id: string;
  email: string;
  role: string;
  institutionId?: string;
}): string {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role, institutionId: user.institutionId },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

beforeAll(async () => {
  await prisma.auditLog.deleteMany();
  await prisma.certificateEvent.deleteMany();
  await prisma.certificate.deleteMany();
  await prisma.issuerKey.deleteMany();
  await prisma.institution.deleteMany();
  await prisma.user.deleteMany();

  const instA = await prisma.institution.create({
    data: { id: 'INST-TEST-A', name: 'Test University A', status: 'ACTIVE' },
  });
  const instB = await prisma.institution.create({
    data: { id: 'INST-TEST-B', name: 'Test University B', status: 'ACTIVE' },
  });
  instAId = instA.id;
  instBId = instB.id;

  const netAdmin = await createTestUser('NETWORK_ADMIN');
  const instAdmin = await createTestUser('INSTITUTION_ADMIN', instAId);
  const instAdminB = await createTestUser('INSTITUTION_ADMIN', instBId, 'b');
  const issuer = await createTestUser('ISSUER', instAId);
  const holder = await createTestUser('HOLDER', instAId);

  netAdminToken = makeToken({ id: netAdmin.id, email: netAdmin.email, role: netAdmin.role });
  instAdminToken = makeToken({
    id: instAdmin.id,
    email: instAdmin.email,
    role: instAdmin.role,
    institutionId: instAdmin.institutionId ?? undefined,
  });
  instAdminBToken = makeToken({
    id: instAdminB.id,
    email: instAdminB.email,
    role: instAdminB.role,
    institutionId: instAdminB.institutionId ?? undefined,
  });
  issuerToken = makeToken({
    id: issuer.id,
    email: issuer.email,
    role: issuer.role,
    institutionId: issuer.institutionId ?? undefined,
  });
  holderToken = makeToken({
    id: holder.id,
    email: holder.email,
    role: holder.role,
    institutionId: holder.institutionId ?? undefined,
  });
});

afterAll(async () => {
  await prisma.auditLog.deleteMany();
  await prisma.certificateEvent.deleteMany();
  await prisma.certificate.deleteMany();
  await prisma.issuerKey.deleteMany();
  await prisma.institution.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

describe('Institution endpoints', () => {
  describe('POST /api/institutions', () => {
    it('returns 401 without token', async () => {
      const res = await request(app)
        .post('/api/institutions')
        .send({ id: 'NEW-INST', name: 'New Inst' });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('returns 403 for non-NETWORK_ADMIN', async () => {
      const res = await request(app)
        .post('/api/institutions')
        .set('Authorization', `Bearer ${instAdminToken}`)
        .send({ id: 'NEW-INST', name: 'New Inst' });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('creates institution as NETWORK_ADMIN', async () => {
      const res = await request(app)
        .post('/api/institutions')
        .set('Authorization', `Bearer ${netAdminToken}`)
        .send({ id: 'NEW-INST', name: 'New Inst' });
      expect(res.status).toBe(201);
      expect(res.body.id).toBe('NEW-INST');
      expect(res.body.name).toBe('New Inst');
      expect(res.body.status).toBe('ACTIVE');
    });

    it('returns 409 for duplicate institution ID', async () => {
      const res = await request(app)
        .post('/api/institutions')
        .set('Authorization', `Bearer ${netAdminToken}`)
        .send({ id: 'NEW-INST', name: 'New Inst Duplicate' });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });
  });

  describe('GET /api/institutions', () => {
    it('returns 401 without token', async () => {
      const res = await request(app).get('/api/institutions');
      expect(res.status).toBe(401);
    });

    it('lists institutions for any authenticated role', async () => {
      const res = await request(app)
        .get('/api/institutions')
        .set('Authorization', `Bearer ${holderToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('PATCH /api/institutions/:id/status', () => {
    it('returns 401 without token', async () => {
      const res = await request(app)
        .patch('/api/institutions/INST-TEST-A/status')
        .send({ status: 'DISABLED' });
      expect(res.status).toBe(401);
    });

    it('returns 403 for non-NETWORK_ADMIN', async () => {
      const res = await request(app)
        .patch('/api/institutions/INST-TEST-A/status')
        .set('Authorization', `Bearer ${instAdminToken}`)
        .send({ status: 'DISABLED' });
      expect(res.status).toBe(403);
    });

    it('updates status as NETWORK_ADMIN and restores', async () => {
      const res = await request(app)
        .patch('/api/institutions/INST-TEST-A/status')
        .set('Authorization', `Bearer ${netAdminToken}`)
        .send({ status: 'DISABLED' });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('DISABLED');
      // Restore for other tests
      await request(app)
        .patch('/api/institutions/INST-TEST-A/status')
        .set('Authorization', `Bearer ${netAdminToken}`)
        .send({ status: 'ACTIVE' });
    });

    it('returns 404 for non-existent institution', async () => {
      const res = await request(app)
        .patch('/api/institutions/NONEXISTENT/status')
        .set('Authorization', `Bearer ${netAdminToken}`)
        .send({ status: 'DISABLED' });
      expect(res.status).toBe(404);
    });
  });
});

describe('Key endpoints', () => {
  const testKeyId = 'INST-TEST-A-KEY-01';
  const testPubKey = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAn0y3...
-----END PUBLIC KEY-----`;

  beforeEach(async () => {
    await prisma.issuerKey.deleteMany({ where: { keyId: testKeyId } });
  });

  describe('POST /api/keys/register', () => {
    it('returns 401 without token', async () => {
      const res = await request(app).post('/api/keys/register').send({
        institutionId: instAId,
        keyId: testKeyId,
        publicKeyPem: testPubKey,
      });
      expect(res.status).toBe(401);
    });

    it('returns 403 for non-INSTITUTION_ADMIN', async () => {
      const res = await request(app)
        .post('/api/keys/register')
        .set('Authorization', `Bearer ${issuerToken}`)
        .send({ institutionId: instAId, keyId: testKeyId, publicKeyPem: testPubKey });
      expect(res.status).toBe(403);
    });

    it('returns 403 when INSTITUTION_ADMIN tries to register key for different institution', async () => {
      const res = await request(app)
        .post('/api/keys/register')
        .set('Authorization', `Bearer ${instAdminToken}`)
        .send({ institutionId: instBId, keyId: testKeyId, publicKeyPem: testPubKey });
      expect(res.status).toBe(403);
    });

    it('registers key for own institution', async () => {
      const res = await request(app)
        .post('/api/keys/register')
        .set('Authorization', `Bearer ${instAdminToken}`)
        .send({ institutionId: instAId, keyId: testKeyId, publicKeyPem: testPubKey });
      expect(res.status).toBe(201);
      expect(res.body.keyId).toBe(testKeyId);
      expect(res.body.institutionId).toBe(instAId);
      expect(res.body.status).toBe('ACTIVE');
    });

    it('returns 409 for duplicate key ID', async () => {
      await request(app)
        .post('/api/keys/register')
        .set('Authorization', `Bearer ${instAdminToken}`)
        .send({ institutionId: instAId, keyId: testKeyId, publicKeyPem: testPubKey });

      const res = await request(app)
        .post('/api/keys/register')
        .set('Authorization', `Bearer ${instAdminToken}`)
        .send({ institutionId: instAId, keyId: testKeyId, publicKeyPem: testPubKey });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('returns 403 for non-existent institution (middleware blocks)', async () => {
      const res = await request(app)
        .post('/api/keys/register')
        .set('Authorization', `Bearer ${instAdminToken}`)
        .send({ institutionId: 'NONEXISTENT', keyId: 'KEY-999', publicKeyPem: testPubKey });
      expect(res.status).toBe(403);
    });

    it('returns 403 for disabled institution', async () => {
      await prisma.institution.update({ where: { id: instAId }, data: { status: 'DISABLED' } });
      const res = await request(app)
        .post('/api/keys/register')
        .set('Authorization', `Bearer ${instAdminToken}`)
        .send({ institutionId: instAId, keyId: 'KEY-DISABLED', publicKeyPem: testPubKey });
      expect(res.status).toBe(403);
      await prisma.institution.update({ where: { id: instAId }, data: { status: 'ACTIVE' } });
    });
  });

  describe('GET /api/keys', () => {
    it('returns 401 without token', async () => {
      const res = await request(app).get('/api/keys');
      expect(res.status).toBe(401);
    });

    it('lists keys for INSTITUTION_ADMIN (scoped to their institution)', async () => {
      await request(app)
        .post('/api/keys/register')
        .set('Authorization', `Bearer ${instAdminToken}`)
        .send({ institutionId: instAId, keyId: testKeyId, publicKeyPem: testPubKey });

      const res = await request(app)
        .get('/api/keys')
        .set('Authorization', `Bearer ${instAdminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some((k: { keyId: string }) => k.keyId === testKeyId)).toBe(true);
    });

    it('lists all keys for NETWORK_ADMIN', async () => {
      const res = await request(app)
        .get('/api/keys')
        .set('Authorization', `Bearer ${netAdminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('PATCH /api/keys/:keyId/status', () => {
    it('returns 401 without token', async () => {
      const res = await request(app)
        .patch(`/api/keys/${testKeyId}/status`)
        .send({ status: 'RETIRED' });
      expect(res.status).toBe(401);
    });

    it('returns 403 for non-INSTITUTION_ADMIN', async () => {
      await request(app)
        .post('/api/keys/register')
        .set('Authorization', `Bearer ${instAdminToken}`)
        .send({ institutionId: instAId, keyId: testKeyId, publicKeyPem: testPubKey });

      const res = await request(app)
        .patch(`/api/keys/${testKeyId}/status`)
        .set('Authorization', `Bearer ${issuerToken}`)
        .send({ status: 'RETIRED' });
      expect(res.status).toBe(403);
    });

    it('returns 403 when INSTITUTION_ADMIN tries to update key for different institution', async () => {
      const netAdminKey = 'INST-TEST-B-KEY-99';
      await request(app)
        .post('/api/keys/register')
        .set('Authorization', `Bearer ${instAdminBToken}`)
        .send({ institutionId: instBId, keyId: netAdminKey, publicKeyPem: testPubKey });

      const res = await request(app)
        .patch(`/api/keys/${netAdminKey}/status`)
        .set('Authorization', `Bearer ${instAdminToken}`)
        .send({ status: 'RETIRED' });
      expect(res.status).toBe(403);
    });

    it('updates key status for own institution', async () => {
      await request(app)
        .post('/api/keys/register')
        .set('Authorization', `Bearer ${instAdminToken}`)
        .send({ institutionId: instAId, keyId: testKeyId, publicKeyPem: testPubKey });

      const res = await request(app)
        .patch(`/api/keys/${testKeyId}/status`)
        .set('Authorization', `Bearer ${instAdminToken}`)
        .send({ status: 'RETIRED' });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('RETIRED');
    });

    it('returns 404 for non-existent key', async () => {
      const res = await request(app)
        .patch('/api/keys/NONEXISTENT/status')
        .set('Authorization', `Bearer ${instAdminToken}`)
        .send({ status: 'RETIRED' });
      expect(res.status).toBe(404);
    });
  });
});
