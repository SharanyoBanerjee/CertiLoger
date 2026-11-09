import { PrismaClient, Role, KeyStatus, CertStatus } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  const instA = await prisma.institution.upsert({
    where: { id: "INST-001" },
    update: {},
    create: {
      id: "INST-001",
      name: "University of CertiLedger",
      status: "ACTIVE",
    },
  });

  const instB = await prisma.institution.upsert({
    where: { id: "INST-002" },
    update: {},
    create: {
      id: "INST-002",
      name: "CertiLedger Institute of Technology",
      status: "ACTIVE",
    },
  });

  await prisma.user.upsert({
    where: { email: "netadmin@certiledger.test" },
    update: {},
    create: {
      id: "user-netadmin",
      name: "Network Admin",
      email: "netadmin@certiledger.test",
      passwordHash,
      role: Role.NETWORK_ADMIN,
    },
  });

  await prisma.user.upsert({
    where: { email: "instadmin@univ.test" },
    update: {},
    create: {
      id: "user-instadmin-a",
      institutionId: instA.id,
      name: "Institution Admin A",
      email: "instadmin@univ.test",
      passwordHash,
      role: Role.INSTITUTION_ADMIN,
    },
  });

  await prisma.user.upsert({
    where: { email: "instadmin@tech.test" },
    update: {},
    create: {
      id: "user-instadmin-b",
      institutionId: instB.id,
      name: "Institution Admin B",
      email: "instadmin@tech.test",
      passwordHash,
      role: Role.INSTITUTION_ADMIN,
    },
  });

  await prisma.user.upsert({
    where: { email: "issuer@univ.test" },
    update: {},
    create: {
      id: "user-issuer-a",
      institutionId: instA.id,
      name: "Authorized Issuer A",
      email: "issuer@univ.test",
      passwordHash,
      role: Role.ISSUER,
    },
  });

  await prisma.user.upsert({
    where: { email: "issuer@tech.test" },
    update: {},
    create: {
      id: "user-issuer-b",
      institutionId: instB.id,
      name: "Authorized Issuer B",
      email: "issuer@tech.test",
      passwordHash,
      role: Role.ISSUER,
    },
  });

  await prisma.user.upsert({
    where: { email: "holder@test.test" },
    update: {},
    create: {
      id: "user-holder",
      institutionId: instA.id,
      name: "Certificate Holder",
      email: "holder@test.test",
      passwordHash,
      role: Role.HOLDER,
    },
  });

  await prisma.user.upsert({
    where: { email: "auditor@test.test" },
    update: {},
    create: {
      id: "user-auditor",
      name: "Auditor",
      email: "auditor@test.test",
      passwordHash,
      role: Role.AUDITOR,
    },
  });

  console.log("Seed complete: 2 institutions, 7 users (1 per role + extra inst admins/issuers)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });