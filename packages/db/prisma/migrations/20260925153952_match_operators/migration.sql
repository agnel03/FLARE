-- CreateEnum
CREATE TYPE "MatchOperatorRole" AS ENUM ('SCORER', 'OFFICIAL', 'ORGANIZER');

-- CreateTable
CREATE TABLE "match_operators" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "role" "MatchOperatorRole" NOT NULL DEFAULT 'SCORER',
    "grantedByAccountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_operators_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "match_operators_matchId_idx" ON "match_operators"("matchId");

-- CreateIndex
CREATE UNIQUE INDEX "match_operators_matchId_accountId_key" ON "match_operators"("matchId", "accountId");

-- AddForeignKey
ALTER TABLE "match_operators" ADD CONSTRAINT "match_operators_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
