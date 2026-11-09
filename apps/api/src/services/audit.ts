import { prisma } from '../config/prisma.js';
import type { Prisma } from '@prisma/client';

export interface AuditLogInput {
  userId?: string;
  action: string;
  meta?: Record<string, unknown>;
}

export async function writeAuditLog(input: AuditLogInput) {
  await prisma.auditLog.create({
    data: {
      userId: input.userId,
      action: input.action,
      meta: input.meta as Prisma.InputJsonValue | undefined,
    },
  });
}

export async function getAuditLogs(
  filters: {
    userId?: string;
    action?: string;
    from?: Date;
    to?: Date;
    limit?: number;
    offset?: number;
  } = {}
) {
  const where: Record<string, unknown> = {};
  if (filters.userId) where.userId = filters.userId;
  if (filters.action) where.action = filters.action;
  if (filters.from || filters.to) {
    where.at = {};
    if (filters.from) (where.at as Record<string, Date>).gte = filters.from;
    if (filters.to) (where.at as Record<string, Date>).lte = filters.to;
  }
  return prisma.auditLog.findMany({
    where,
    orderBy: { at: 'desc' },
    take: filters.limit ?? 100,
    skip: filters.offset ?? 0,
  });
}
