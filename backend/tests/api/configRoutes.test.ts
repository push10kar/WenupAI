import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../../src/app";
import { config } from "../../src/config";

describe("Config Routes - LLM Provider", () => {
  it("GET /api/config/llm returns the configured provider", async () => {
    const response = await request(app).get("/api/config/llm");

    expect(response.status).toBe(200);
    expect(["mock", "gemini", "openrouter"]).toContain(response.body.provider);
    expect(response.body.provider).toBe(config.llmProvider);
  });

  it("exposes only the non-sensitive provider field", async () => {
    const response = await request(app).get("/api/config/llm");

    // Strict allowlist: no API keys, models, database paths, or other leakage.
    expect(Object.keys(response.body).sort()).toEqual(["provider"]);
  });
});