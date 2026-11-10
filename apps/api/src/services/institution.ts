import { prisma } from '../config/prisma.js';
import { ConflictError, NotFoundError, ForbiddenError } from '../middleware/errors.js';

export interface CreateInstitutionInput {
  id: string;
  name: string;
}

export interface InstitutionWithKeys {
  id: string;
  name: string;
  status: string;
  createdAt: Date;
  keys: { keyId: string; status: string; validFrom: Date }[];
}

export async function createInstitution(input: CreateInstitutionInput) {
  const existing = await prisma.institution.findUnique({ where: { id: input.id } });
  if (existing) {
    throw new ConflictError(`Institution ${input.id} already exists`);
  }
  return prisma.institution.create({
    data: { id: input.id, name: input.name, status: 'ACTIVE' },
  });
}

export async function listInstitutions() {
  return prisma.institution.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, status: true, createdAt: true },
  });
}

export async function getInstitutionWithKeys(id: string): Promise<InstitutionWithKeys | null> {
  const inst = await prisma.institution.findUnique({
    where: { id },
    include: { keys: { select: { keyId: true, status: true, validFrom: true } } },
  });
  if (!inst) return null;
  return {
    id: inst.id,
    name: inst.name,
    status: inst.status,
    createdAt: inst.createdAt,
    keys: inst.keys,
  };
}

export async function setInstitutionStatus(id: string, status: 'ACTIVE' | 'DISABLED') {
  const inst = await prisma.institution.findUnique({ where: { id } });
  if (!inst) {
    throw new NotFoundError('Institution not found');
  }
  return prisma.institution.update({ where: { id }, data: { status } });
}

export async function registerIssuerKey(
  institutionId: string,
  keyId: string,
  publicKeyPem: string
) {
  const inst = await prisma.institution.findUnique({ where: { id: institutionId } });
  if (!inst) {
    throw new NotFoundError('Institution not found');
  }
  if (inst.status !== 'ACTIVE') {
    throw new ForbiddenError('Institution is not active');
  }
  const existing = await prisma.issuerKey.findUnique({ where: { keyId } });
  if (existing) {
    throw new ConflictError(`Key ${keyId} already exists`);
  }
  return prisma.issuerKey.create({
    data: { keyId, institutionId, publicKeyPem, status: 'ACTIVE', validFrom: new Date() },
  });
}

export async function setKeyStatus(keyId: string, status: 'ACTIVE' | 'RETIRED' | 'COMPROMISED') {
  const key = await prisma.issuerKey.findUnique({ where: { keyId } });
  if (!key) {
    throw new NotFoundError('Key not found');
  }
  return prisma.issuerKey.update({ where: { keyId }, data: { status } });
}

export async function listKeys(institutionId?: string) {
  return prisma.issuerKey.findMany({
    where: institutionId ? { institutionId } : {},
    orderBy: { validFrom: 'desc' },
    select: { keyId: true, institutionId: true, publicKeyPem: true, status: true, validFrom: true },
  });
}

export async function getKey(keyId: string) {
  return prisma.issuerKey.findUnique({ where: { keyId } });
}
