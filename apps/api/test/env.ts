// Runs before any test module is imported (jest `setupFiles`), so
// @flare/db's PrismaClient singleton is constructed against the TEST
// database, never the dev one. Create + migrate flare_test once via:
//   DATABASE_URL="postgresql://flare:flare_dev_password@localhost:5432/flare_test?schema=public" \
//     pnpm --filter @flare/db exec prisma migrate deploy
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://flare:flare_dev_password@localhost:5432/flare_test?schema=public";
process.env.JWT_ACCESS_SECRET = "test-access-secret";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret";
