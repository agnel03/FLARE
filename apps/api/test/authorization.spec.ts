import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { createTestApp, uniqueEmail } from "./utils/test-app";

/**
 * Exercises the exact matrix documented in docs/PERMISSION_MATRIX.md
 * Section 11. Complements apps/api/test/manual/permission-matrix.sh
 * (black-box, requires a running server) with deterministic, CI-runnable
 * assertions against a real Nest app + Postgres test database.
 */
describe("Match authorization matrix", () => {
  let app: INestApplication;
  let server: any;

  let ownerToken: string;
  let scorerToken: string;
  let officialToken: string;
  let organizerToken: string;
  let teamManagerToken: string;
  let strangerToken: string;

  let ownerPlayerId: string;
  let teamManagerPlayerId: string;
  let scorerAccountId: string;

  let homeTeamId: string;
  let awayTeamId: string;
  let matchId: string;

  async function register(label: string) {
    const email = uniqueEmail(label);
    const res = await request(server)
      .post("/v1/auth/register")
      .send({ email, password: "password123", displayName: label })
      .expect(201);
    return { email, token: res.body.data.accessToken as string };
  }

  async function me(token: string) {
    const res = await request(server).get("/v1/me").set("Authorization", `Bearer ${token}`).expect(200);
    return res.body.data as { accountId: string; player: { id: string } };
  }

  beforeAll(async () => {
    app = await createTestApp();
    server = app.getHttpServer();

    const owner = await register("authz-owner");
    const scorer = await register("authz-scorer");
    const official = await register("authz-official");
    const organizer = await register("authz-organizer");
    const teamManager = await register("authz-teammgr");
    const stranger = await register("authz-stranger");
    ownerToken = owner.token;
    scorerToken = scorer.token;
    officialToken = official.token;
    organizerToken = organizer.token;
    teamManagerToken = teamManager.token;
    strangerToken = stranger.token;

    const ownerMe = await me(ownerToken);
    ownerPlayerId = ownerMe.player.id;
    const teamManagerMe = await me(teamManagerToken);
    teamManagerPlayerId = teamManagerMe.player.id;
    const scorerMe = await me(scorerToken);
    scorerAccountId = scorerMe.accountId;

    const home = await request(server)
      .post("/v1/teams")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Authz Home" })
      .expect(201);
    homeTeamId = home.body.data.id;

    const away = await request(server)
      .post("/v1/teams")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Authz Away" })
      .expect(201);
    awayTeamId = away.body.data.id;

    const match = await request(server)
      .post("/v1/matches")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ homeTeamId, awayTeamId })
      .expect(201);
    matchId = match.body.data.id;

    for (const [email, role] of [
      [scorer.email, "SCORER"],
      [official.email, "OFFICIAL"],
      [organizer.email, "ORGANIZER"],
    ] as const) {
      await request(server)
        .post(`/v1/matches/${matchId}/operators`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({ email, role })
        .expect(201);
    }

    await request(server)
      .post(`/v1/teams/${homeTeamId}/members`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ playerId: teamManagerPlayerId, role: "MANAGER" })
      .expect(201);
  });

  afterAll(async () => {
    await app.close();
  });

  it("denies SCORER starting a SCHEDULED match", async () => {
    const res = await request(server)
      .post(`/v1/matches/${matchId}/start`)
      .set("Authorization", `Bearer ${scorerToken}`)
      .expect(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("allows ORGANIZER to start the match", async () => {
    await request(server)
      .post(`/v1/matches/${matchId}/start`)
      .set("Authorization", `Bearer ${organizerToken}`)
      .expect(201);
  });

  it("adds the owner as a match participant (creator has MATCH_LINEUP_MANAGE)", async () => {
    await request(server)
      .post(`/v1/matches/${matchId}/participants`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ playerId: ownerPlayerId, teamId: homeTeamId, role: "STARTER" })
      .expect(201);
  });

  it("denies OFFICIAL managing the lineup", async () => {
    const res = await request(server)
      .post(`/v1/matches/${matchId}/participants`)
      .set("Authorization", `Bearer ${officialToken}`)
      .send({ playerId: teamManagerPlayerId, teamId: awayTeamId, role: "STARTER" })
      .expect(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("allows ORGANIZER managing the lineup", async () => {
    await request(server)
      .post(`/v1/matches/${matchId}/participants`)
      .set("Authorization", `Bearer ${organizerToken}`)
      .send({ playerId: teamManagerPlayerId, teamId: awayTeamId, role: "STARTER" })
      .expect(201);
  });

  it("denies ORGANIZER recording a football event", async () => {
    const res = await request(server)
      .post(`/v1/matches/${matchId}/events`)
      .set("Authorization", `Bearer ${organizerToken}`)
      .send({
        clientEventId: "authz-organizer-goal",
        eventType: "GOAL",
        teamId: homeTeamId,
        primaryPlayerId: ownerPlayerId,
        matchClockSeconds: 1,
        metadata: {},
      })
      .expect(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  let scorerEventId: string;

  it("allows SCORER recording a football event", async () => {
    const res = await request(server)
      .post(`/v1/matches/${matchId}/events`)
      .set("Authorization", `Bearer ${scorerToken}`)
      .send({
        clientEventId: "authz-scorer-goal",
        eventType: "GOAL",
        teamId: homeTeamId,
        primaryPlayerId: ownerPlayerId,
        matchClockSeconds: 100,
        metadata: {},
      })
      .expect(201);
    scorerEventId = res.body.data.id;
  });

  it("denies SCORER correcting an event", async () => {
    const res = await request(server)
      .patch(`/v1/matches/${matchId}/events/${scorerEventId}`)
      .set("Authorization", `Bearer ${scorerToken}`)
      .send({ reason: "scorer trying to correct" })
      .expect(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("denies SCORER retracting an event", async () => {
    const res = await request(server)
      .post(`/v1/matches/${matchId}/events/${scorerEventId}/retract`)
      .set("Authorization", `Bearer ${scorerToken}`)
      .send({ reason: "scorer trying to retract" })
      .expect(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("allows OFFICIAL correcting an event", async () => {
    await request(server)
      .patch(`/v1/matches/${matchId}/events/${scorerEventId}`)
      .set("Authorization", `Bearer ${officialToken}`)
      .send({ matchClockSeconds: 101, reason: "official correction" })
      .expect(200);
  });

  it("allows a team MANAGER to record an event for their own team's match", async () => {
    await request(server)
      .post(`/v1/matches/${matchId}/events`)
      .set("Authorization", `Bearer ${teamManagerToken}`)
      .send({
        clientEventId: "authz-teammgr-goal",
        eventType: "GOAL",
        teamId: homeTeamId,
        primaryPlayerId: ownerPlayerId,
        matchClockSeconds: 200,
        metadata: {},
      })
      .expect(201);
  });

  it("denies a fully unrelated authenticated account recording an event", async () => {
    const res = await request(server)
      .post(`/v1/matches/${matchId}/events`)
      .set("Authorization", `Bearer ${strangerToken}`)
      .send({
        clientEventId: "authz-stranger-goal",
        eventType: "GOAL",
        teamId: homeTeamId,
        matchClockSeconds: 1,
        metadata: {},
      })
      .expect(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("denies an unrelated account self-granting an operator role (privilege escalation)", async () => {
    const strangerMe = await me(strangerToken);
    const res = await request(server)
      .post(`/v1/matches/${matchId}/operators`)
      .set("Authorization", `Bearer ${strangerToken}`)
      .send({ email: `stranger-${strangerMe.accountId}@nope.test`, role: "SCORER" })
      .expect(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("denies an unrelated account finalizing the match", async () => {
    const res = await request(server)
      .post(`/v1/matches/${matchId}/complete`)
      .set("Authorization", `Bearer ${strangerToken}`)
      .expect(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("resource-ID tampering: unrelated account cannot manage a team it didn't create by guessing the ID", async () => {
    const res = await request(server)
      .post(`/v1/teams/${homeTeamId}/members`)
      .set("Authorization", `Bearer ${strangerToken}`)
      .send({ playerId: ownerPlayerId, role: "MANAGER" })
      .expect(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("IDOR: a player cannot edit another player's profile by ID", async () => {
    const res = await request(server)
      .patch(`/v1/players/${ownerPlayerId}`)
      .set("Authorization", `Bearer ${strangerToken}`)
      .send({ displayName: "Hijacked" })
      .expect(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("revokes SCORER and confirms they immediately lose access", async () => {
    await request(server)
      .delete(`/v1/matches/${matchId}/operators/${scorerAccountId}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(200);

    const res = await request(server)
      .post(`/v1/matches/${matchId}/events`)
      .set("Authorization", `Bearer ${scorerToken}`)
      .send({
        clientEventId: "authz-scorer-after-revoke",
        eventType: "GOAL",
        teamId: homeTeamId,
        matchClockSeconds: 300,
        metadata: {},
      })
      .expect(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("duplicate operator assignment upserts rather than erroring or duplicating", async () => {
    const before = await request(server)
      .get(`/v1/matches/${matchId}/operators`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(200);
    const countBefore = before.body.data.length;

    // Re-grant the same account (OFFICIAL, already granted in beforeAll) again.
    const officialMeRes = await request(server)
      .get("/v1/me")
      .set("Authorization", `Bearer ${officialToken}`);
    const officialEmail = officialMeRes.body.data.email;

    await request(server)
      .post(`/v1/matches/${matchId}/operators`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ email: officialEmail, role: "OFFICIAL" })
      .expect(201);

    const after = await request(server)
      .get(`/v1/matches/${matchId}/operators`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(200);

    expect(after.body.data.length).toBe(countBefore); // no duplicate row created
  });

  it("granting an operator for a nonexistent account is rejected", async () => {
    const res = await request(server)
      .post(`/v1/matches/${matchId}/operators`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ email: "nobody-at-all@test.flare", role: "SCORER" })
      .expect(404);
    expect(res.body.error.code).toBe("RESOURCE_NOT_FOUND");
  });

  it("granting an operator on a nonexistent match is rejected", async () => {
    const res = await request(server)
      .post("/v1/matches/00000000-0000-0000-0000-000000000000/operators")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ email: "nobody-at-all@test.flare", role: "SCORER" })
      .expect(404);
    expect(res.body.error.code).toBe("RESOURCE_NOT_FOUND");
  });

  it("allows OFFICIAL to finalize the match (run last — locks the match)", async () => {
    await request(server)
      .post(`/v1/matches/${matchId}/complete`)
      .set("Authorization", `Bearer ${officialToken}`)
      .expect(201);
  });
});
