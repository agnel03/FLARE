-- CreateEnum
CREATE TYPE "PlayerStatus" AS ENUM ('DRAFT', 'ACTIVE', 'RESTRICTED', 'SUSPENDED', 'MERGED', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "PreferredFoot" AS ENUM ('LEFT', 'RIGHT', 'BOTH', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "FootballPosition" AS ENUM ('GOALKEEPER', 'DEFENDER', 'MIDFIELDER', 'FORWARD', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('PLAYER', 'CAPTAIN', 'MANAGER', 'STAFF');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('INVITED', 'PENDING', 'ACTIVE', 'SUSPENDED', 'ENDED', 'REJECTED', 'REVOKED');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('SCHEDULED', 'LIVE', 'PAUSED', 'COMPLETED', 'CANCELLED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "SubstitutionModel" AS ENUM ('NORMAL', 'ROLLING');

-- CreateEnum
CREATE TYPE "PeriodStatus" AS ENUM ('SCHEDULED', 'ACTIVE', 'ENDED');

-- CreateEnum
CREATE TYPE "ParticipantRole" AS ENUM ('STARTER', 'SUBSTITUTE');

-- CreateEnum
CREATE TYPE "FootballEventType" AS ENUM ('MATCH_CREATED', 'MATCH_STARTED', 'PERIOD_STARTED', 'PERIOD_ENDED', 'HALF_TIME', 'MATCH_PAUSED', 'MATCH_RESUMED', 'MATCH_COMPLETED', 'GOAL', 'OWN_GOAL', 'SHOT', 'SHOT_ON_TARGET', 'SHOT_OFF_TARGET', 'BLOCKED_SHOT', 'ASSIST', 'KEY_PASS', 'PASS', 'PASS_COMPLETED', 'PASS_INCOMPLETE', 'CROSS', 'THROUGH_BALL', 'POSSESSION_START', 'POSSESSION_END', 'TURNOVER', 'DRIBBLE', 'CARRY', 'TACKLE', 'INTERCEPTION', 'BLOCK', 'CLEARANCE', 'PRESSURE', 'RECOVERY', 'SAVE', 'CLAIM', 'PUNCH', 'DISTRIBUTION', 'GOALKEEPER_ERROR', 'FOUL', 'YELLOW_CARD', 'RED_CARD', 'SECOND_YELLOW', 'ADVANTAGE', 'CORNER', 'FREE_KICK', 'GOAL_KICK', 'THROW_IN', 'KICK_OFF', 'PENALTY_AWARDED', 'PENALTY_MISSED', 'PENALTY_SCORED', 'PENALTY_SAVED', 'SUBSTITUTION', 'FORMATION_CHANGE', 'POSITION_CHANGE', 'TACTICAL_NOTE');

-- CreateEnum
CREATE TYPE "EventSource" AS ENUM ('SCORER', 'OFFICIAL', 'IMPORT', 'SYSTEM', 'SENSOR');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('ACTIVE', 'CORRECTED', 'RETRACTED');

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_profiles" (
    "id" TEXT NOT NULL,
    "accountId" TEXT,
    "displayName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "nationality" TEXT,
    "preferredFoot" "PreferredFoot" NOT NULL DEFAULT 'UNKNOWN',
    "primaryPosition" "FootballPosition" NOT NULL DEFAULT 'UNKNOWN',
    "secondaryPosition" "FootballPosition",
    "avatarUrl" TEXT,
    "status" "PlayerStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clubs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clubs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "clubId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_memberships" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "role" "MembershipRole" NOT NULL DEFAULT 'PLAYER',
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "startAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "venues" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "venues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matches" (
    "id" TEXT NOT NULL,
    "homeTeamId" TEXT NOT NULL,
    "awayTeamId" TEXT NOT NULL,
    "venueId" TEXT,
    "playersPerSide" INTEGER NOT NULL DEFAULT 11,
    "durationMinutes" INTEGER NOT NULL DEFAULT 90,
    "periodCount" INTEGER NOT NULL DEFAULT 2,
    "substitutionModel" "SubstitutionModel" NOT NULL DEFAULT 'NORMAL',
    "status" "MatchStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "homeScore" INTEGER NOT NULL DEFAULT 0,
    "awayScore" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "periods" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "periodNumber" INTEGER NOT NULL,
    "status" "PeriodStatus" NOT NULL DEFAULT 'SCHEDULED',
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_participants" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "role" "ParticipantRole" NOT NULL DEFAULT 'STARTER',
    "jerseyNumber" INTEGER,
    "position" "FootballPosition" NOT NULL DEFAULT 'UNKNOWN',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "enteredAtSec" INTEGER,
    "exitedAtSec" INTEGER,
    "minutesPlayed" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "match_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "football_events" (
    "id" TEXT NOT NULL,
    "clientEventId" TEXT,
    "matchId" TEXT NOT NULL,
    "periodId" TEXT,
    "eventType" "FootballEventType" NOT NULL,
    "teamId" TEXT,
    "primaryPlayerId" TEXT,
    "secondaryPlayerId" TEXT,
    "matchClockSeconds" INTEGER NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pitchX" DOUBLE PRECISION,
    "pitchY" DOUBLE PRECISION,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "source" "EventSource" NOT NULL DEFAULT 'SCORER',
    "createdById" TEXT,
    "status" "EventStatus" NOT NULL DEFAULT 'ACTIVE',
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "sequence" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "football_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_revisions" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "previousMetadata" JSONB NOT NULL,
    "previousStatus" "EventStatus" NOT NULL,
    "reason" TEXT,
    "correctedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "accounts_email_key" ON "accounts"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "refresh_tokens_accountId_idx" ON "refresh_tokens"("accountId");

-- CreateIndex
CREATE INDEX "team_memberships_teamId_idx" ON "team_memberships"("teamId");

-- CreateIndex
CREATE INDEX "team_memberships_playerId_idx" ON "team_memberships"("playerId");

-- CreateIndex
CREATE INDEX "matches_status_idx" ON "matches"("status");

-- CreateIndex
CREATE UNIQUE INDEX "periods_matchId_periodNumber_key" ON "periods"("matchId", "periodNumber");

-- CreateIndex
CREATE INDEX "match_participants_matchId_idx" ON "match_participants"("matchId");

-- CreateIndex
CREATE UNIQUE INDEX "match_participants_matchId_playerId_key" ON "match_participants"("matchId", "playerId");

-- CreateIndex
CREATE INDEX "football_events_matchId_periodId_matchClockSeconds_idx" ON "football_events"("matchId", "periodId", "matchClockSeconds");

-- CreateIndex
CREATE INDEX "football_events_matchId_eventType_idx" ON "football_events"("matchId", "eventType");

-- CreateIndex
CREATE UNIQUE INDEX "football_events_matchId_clientEventId_key" ON "football_events"("matchId", "clientEventId");

-- CreateIndex
CREATE INDEX "event_revisions_eventId_idx" ON "event_revisions"("eventId");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_profiles" ADD CONSTRAINT "player_profiles_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_memberships" ADD CONSTRAINT "team_memberships_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "player_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_memberships" ADD CONSTRAINT "team_memberships_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_homeTeamId_fkey" FOREIGN KEY ("homeTeamId") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_awayTeamId_fkey" FOREIGN KEY ("awayTeamId") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "venues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "periods" ADD CONSTRAINT "periods_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_participants" ADD CONSTRAINT "match_participants_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_participants" ADD CONSTRAINT "match_participants_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_participants" ADD CONSTRAINT "match_participants_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "player_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "football_events" ADD CONSTRAINT "football_events_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "football_events" ADD CONSTRAINT "football_events_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "periods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "football_events" ADD CONSTRAINT "football_events_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "football_events" ADD CONSTRAINT "football_events_primaryPlayerId_fkey" FOREIGN KEY ("primaryPlayerId") REFERENCES "player_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "football_events" ADD CONSTRAINT "football_events_secondaryPlayerId_fkey" FOREIGN KEY ("secondaryPlayerId") REFERENCES "player_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_revisions" ADD CONSTRAINT "event_revisions_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "football_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
