import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { createTestApp, uniqueEmail } from "./utils/test-app";

describe("Auth", () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("registers a new account and returns tokens", async () => {
    const res = await request(app.getHttpServer())
      .post("/v1/auth/register")
      .send({ email: uniqueEmail("register"), password: "password123", displayName: "Auth Test" })
      .expect(201);

    expect(res.body.data.accessToken).toEqual(expect.any(String));
    expect(res.body.data.refreshToken).toEqual(expect.any(String));
  });

  it("rejects registering the same email twice", async () => {
    const email = uniqueEmail("dupe");
    await request(app.getHttpServer())
      .post("/v1/auth/register")
      .send({ email, password: "password123", displayName: "First" })
      .expect(201);

    const res = await request(app.getHttpServer())
      .post("/v1/auth/register")
      .send({ email, password: "password123", displayName: "Second" })
      .expect(409);

    expect(res.body.error.code).toBe("STATE_CONFLICT");
  });

  it("logs in with correct credentials", async () => {
    const email = uniqueEmail("login");
    await request(app.getHttpServer())
      .post("/v1/auth/register")
      .send({ email, password: "password123", displayName: "Login Test" })
      .expect(201);

    const res = await request(app.getHttpServer())
      .post("/v1/auth/login")
      .send({ email, password: "password123" })
      .expect(200);

    expect(res.body.data.accessToken).toEqual(expect.any(String));
  });

  it("rejects login with wrong password", async () => {
    const email = uniqueEmail("badpw");
    await request(app.getHttpServer())
      .post("/v1/auth/register")
      .send({ email, password: "password123", displayName: "Bad Password" })
      .expect(201);

    const res = await request(app.getHttpServer())
      .post("/v1/auth/login")
      .send({ email, password: "wrong-password" })
      .expect(401);

    expect(res.body.error.code).toBe("AUTHENTICATION_REQUIRED");
  });

  it("rejects login for an email that doesn't exist", async () => {
    const res = await request(app.getHttpServer())
      .post("/v1/auth/login")
      .send({ email: uniqueEmail("ghost"), password: "password123" })
      .expect(401);

    expect(res.body.error.code).toBe("AUTHENTICATION_REQUIRED");
  });

  it("rejects an unauthenticated request to a protected endpoint", async () => {
    const res = await request(app.getHttpServer()).get("/v1/me").expect(401);
    expect(res.body.error.code).toBe("AUTHENTICATION_REQUIRED");
  });

  it("accepts an authenticated request with a valid access token", async () => {
    const email = uniqueEmail("me");
    const reg = await request(app.getHttpServer())
      .post("/v1/auth/register")
      .send({ email, password: "password123", displayName: "Me Test" })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get("/v1/me")
      .set("Authorization", `Bearer ${reg.body.data.accessToken}`)
      .expect(200);

    expect(res.body.data.email).toBe(email);
    expect(res.body.data.player.displayName).toBe("Me Test");
  });

  it("rejects a malformed/garbage access token", async () => {
    const res = await request(app.getHttpServer())
      .get("/v1/me")
      .set("Authorization", "Bearer not-a-real-token")
      .expect(401);
    expect(res.body.error.code).toBe("AUTHENTICATION_REQUIRED");
  });
});
