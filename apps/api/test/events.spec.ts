import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { createTestApp, uniqueEmail } from "./utils/test-app";

describe("Football Event Engine", () => {
  let app: INestApplication;
  let server: any;
  let token: string;
  let playerId: string;
  let homeTeamId: string;
  let awayTeamId: string;
  let matchId: string;

  beforeAll(async () => {
    app = await createTestApp();
    server = app.getHttpServer();

    const reg = await request(server)
      .post("/v1/auth/register")
      .send({ email: uniqueEmail("events-owner"), password: "password123", displayName: "Events Owner" })
      .expect(201);
    token = reg.body.data.accessToken;

    const me = await request(server).get("/v1/me").set("Authorization", `Bearer ${token}`).expect(200);
    playerId = me.body.data.player.id;

    const home = await request(server)
      .post("/v1/teams")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Events Home" })
      .expect(201);
    homeTeamId = home.body.data.id;

    const away = await request(server)
      .post("/v1/teams")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Events Away" })
      .expect(201);
    awayTeamId = away.body.data.id;

    const match = await request(server)
      .post("/v1/matches")
      .set("Authorization", `Bearer ${token}`)
      .send({ homeTeamId, awayTeamId })
      .expect(201);
    matchId = match.body.data.id;

    await request(server)
      .post(`/v1/matches/${matchId}/participants`)
      .set("Authorization", `Bearer ${token}`)
      .send({ playerId, teamId: homeTeamId, role: "STARTER" })
      .expect(201);

    await request(server).post(`/v1/matches/${matchId}/start`).set("Authorization", `Bearer ${token}`).expect(201);
  });

  afterAll(async () => {
    await app.close();
  });

  it("rejects an event before the match is live", async () => {
    // separate SCHEDULED match to prove MATCH_NOT_LIVE is enforced independent of authorization
    const home = await request(server)
      .post("/v1/teams")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Not Live Home" })
      .expect(201);
    const away = await request(server)
      .post("/v1/teams")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Not Live Away" })
      .expect(201);
    const scheduledMatch = await request(server)
      .post("/v1/matches")
      .set("Authorization", `Bearer ${token}`)
      .send({ homeTeamId: home.body.data.id, awayTeamId: away.body.data.id })
      .expect(201);

    const res = await request(server)
      .post(`/v1/matches/${scheduledMatch.body.data.id}/events`)
      .set("Authorization", `Bearer ${token}`)
      .send({ clientEventId: "not-live-1", eventType: "GOAL", matchClockSeconds: 1, metadata: {} })
      .expect(422);
    expect(res.body.error.code).toBe("MATCH_NOT_LIVE");
  });

  it("rejects an event referencing a player who isn't a match participant", async () => {
    const res = await request(server)
      .post(`/v1/matches/${matchId}/events`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        clientEventId: "invalid-player-1",
        eventType: "GOAL",
        teamId: homeTeamId,
        primaryPlayerId: "00000000-0000-0000-0000-000000000000",
        matchClockSeconds: 1,
        metadata: {},
      })
      .expect(422);
    expect(res.body.error.code).toBe("EVENT_INVALID");
  });

  it("rejects an event with an invalid team ID for this match", async () => {
    const res = await request(server)
      .post(`/v1/matches/${matchId}/events`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        clientEventId: "invalid-team-1",
        eventType: "GOAL",
        teamId: "00000000-0000-0000-0000-000000000000",
        matchClockSeconds: 1,
        metadata: {},
      })
      .expect(422);
    expect(res.body.error.code).toBe("EVENT_INVALID");
  });

  it("rejects malformed request payloads", async () => {
    const res = await request(server)
      .post(`/v1/matches/${matchId}/events`)
      .set("Authorization", `Bearer ${token}`)
      .send({ clientEventId: "malformed-1", eventType: "NOT_A_REAL_EVENT_TYPE", matchClockSeconds: 1 })
      .expect(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  let goalEventId: string;

  it("records a valid GOAL and updates the live score", async () => {
    const res = await request(server)
      .post(`/v1/matches/${matchId}/events`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        clientEventId: "events-goal-1",
        eventType: "GOAL",
        teamId: homeTeamId,
        primaryPlayerId: playerId,
        matchClockSeconds: 500,
        metadata: { foot: "RIGHT" },
      })
      .expect(201);
    goalEventId = res.body.data.id;
    expect(res.body.data.status).toBe("ACTIVE");

    const stats = await request(server).get(`/v1/matches/${matchId}/stats`).expect(200);
    expect(stats.body.data.homeScore).toBe(1);
  });

  it("is idempotent: replaying the same clientEventId returns the original event, not a duplicate", async () => {
    const res = await request(server)
      .post(`/v1/matches/${matchId}/events`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        clientEventId: "events-goal-1", // same key as above
        eventType: "GOAL",
        teamId: homeTeamId,
        primaryPlayerId: playerId,
        matchClockSeconds: 500,
        metadata: { foot: "RIGHT" },
      })
      .expect(201);
    expect(res.body.data.id).toBe(goalEventId);

    const stats = await request(server).get(`/v1/matches/${matchId}/stats`).expect(200);
    expect(stats.body.data.homeScore).toBe(1); // still 1, not 2
  });

  it("corrects an event, recording an audit revision", async () => {
    const res = await request(server)
      .patch(`/v1/matches/${matchId}/events/${goalEventId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ matchClockSeconds: 555, reason: "clock correction" })
      .expect(200);

    expect(res.body.data.status).toBe("CORRECTED");
    expect(res.body.data.matchClockSeconds).toBe(555);

    const timeline = await request(server).get(`/v1/matches/${matchId}/timeline`).expect(200);
    const corrected = timeline.body.data.find((e: any) => e.id === goalEventId);
    expect(corrected.matchClockSeconds).toBe(555);
    // corrected events remain in stats/timeline (only RETRACTED is excluded)
    const stats = await request(server).get(`/v1/matches/${matchId}/stats`).expect(200);
    expect(stats.body.data.homeScore).toBe(1);
  });

  it("retracts an event and recalculates the score (not an incremental decrement)", async () => {
    await request(server)
      .post(`/v1/matches/${matchId}/events/${goalEventId}/retract`)
      .set("Authorization", `Bearer ${token}`)
      .send({ reason: "disallowed after video review" })
      .expect(201);

    const stats = await request(server).get(`/v1/matches/${matchId}/stats`).expect(200);
    expect(stats.body.data.homeScore).toBe(0);

    const timeline = await request(server).get(`/v1/matches/${matchId}/timeline`).expect(200);
    expect(timeline.body.data.find((e: any) => e.id === goalEventId)).toBeUndefined(); // excluded from timeline
  });

  it("retracting an already-retracted event is idempotent (no error)", async () => {
    await request(server)
      .post(`/v1/matches/${matchId}/events/${goalEventId}/retract`)
      .set("Authorization", `Bearer ${token}`)
      .send({ reason: "retract again" })
      .expect(201);
  });

  it("own-goal scoring attributes the goal to the opposing team", async () => {
    const res = await request(server)
      .post(`/v1/matches/${matchId}/events`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        clientEventId: "events-own-goal-1",
        eventType: "GOAL",
        teamId: homeTeamId,
        primaryPlayerId: playerId,
        matchClockSeconds: 600,
        metadata: { ownGoal: true },
      })
      .expect(201);
    expect(res.body.data.metadata.ownGoal).toBe(true);

    const stats = await request(server).get(`/v1/matches/${matchId}/stats`).expect(200);
    expect(stats.body.data.awayScore).toBe(1); // credited to the away team, not home
    expect(stats.body.data.homeScore).toBe(0);
  });
});
