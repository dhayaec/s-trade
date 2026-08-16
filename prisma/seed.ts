// Placeholder seed — replace with your data.
// Runs via `pnpm prisma db seed` (see prisma.config.ts).
// This file is intentionally minimal; real seeds use upsert + skipDuplicates
// to be idempotent across repeated runs.

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('No seed data defined — add your models and upserts here.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
