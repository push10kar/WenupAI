import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/app";

describe("Backend Foundation - Health Check", () => {
  it("GET /health returns 200 and status ok", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("status", "ok");
    expect(response.body).toHaveProperty("timestamp");
    expect(typeof response.body.timestamp).toBe("string");
  });

  it("GET /non-existent returns 404 with standard API error contract", async () => {
    const response = await request(app).get("/non-existent");

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty("error");
    expect(response.body.error).toHaveProperty("code", "NOT_FOUND");
    expect(response.body.error).toHaveProperty("message");
  });
});
