import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import request from "supertest";
import { app } from "../backend/src/app";
import { config } from "../backend/src/config";

describe("System Foundation Smoke Test", () => {
  it("verifies required root repository files exist", () => {
    const rootDir = path.resolve(__dirname, "..");
    expect(fs.existsSync(path.join(rootDir, "ARCHITECTURE.md"))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, "README.md"))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, ".gitignore"))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, ".env.example"))).toBe(true);
  });

  it("verifies backend health endpoint responds with 200 OK", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("verifies default configuration allows local operation without external API keys", () => {
    expect(config.port).toBeDefined();
    expect(config.llmProvider).toBe("mock");
  });
});
