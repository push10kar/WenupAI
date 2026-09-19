import { describe, expect, it } from "vitest";
import { AppConfig, validateConfig } from "../../src/config";
import {
  GeminiLLMClient,
  GroqLLMClient,
  LLMClientError,
  MockLLMClient,
  createLLMClient,
} from "../../src/infrastructure/llm";

describe("Phase 13: Provider Factory & Configuration Validation", () => {
  const dummyFetch = async () => new Response("{}", { status: 200 });

  describe("createLLMClient factory", () => {
    it("creates MockLLMClient when llmProvider is 'mock'", () => {
      const config: AppConfig = {
        port: 3000,
        nodeEnv: "test",
        llmProvider: "mock",
        geminiModel: "gemini-1.5-flash",
        groqModel: "llama-3.3-70b-versatile",
        llmTimeoutMs: 15000,
      };

      const client = createLLMClient(config);
      expect(client).toBeInstanceOf(MockLLMClient);
    });

    it("creates GeminiLLMClient when llmProvider is 'gemini' and key is present", () => {
      const config: AppConfig = {
        port: 3000,
        nodeEnv: "test",
        llmProvider: "gemini",
        geminiApiKey: "valid-gemini-key",
        geminiModel: "gemini-1.5-flash",
        groqModel: "llama-3.3-70b-versatile",
        llmTimeoutMs: 15000,
      };

      const client = createLLMClient(config, {
        fetch: dummyFetch as typeof fetch,
      });
      expect(client).toBeInstanceOf(GeminiLLMClient);
    });

    it("throws CONFIGURATION_ERROR when llmProvider is 'gemini' but key is missing", () => {
      const config: AppConfig = {
        port: 3000,
        nodeEnv: "test",
        llmProvider: "gemini",
        geminiApiKey: "",
        geminiModel: "gemini-1.5-flash",
        groqModel: "llama-3.3-70b-versatile",
        llmTimeoutMs: 15000,
      };

      expect(() => createLLMClient(config)).toThrow(LLMClientError);
      try {
        createLLMClient(config);
      } catch (err) {
        expect(err).toBeInstanceOf(LLMClientError);
        expect((err as LLMClientError).code).toBe("CONFIGURATION_ERROR");
        expect((err as LLMClientError).message).toContain("GEMINI_API_KEY");
      }
    });

    it("creates GroqLLMClient when llmProvider is 'groq' and key is present", () => {
      const config: AppConfig = {
        port: 3000,
        nodeEnv: "test",
        llmProvider: "groq",
        groqApiKey: "valid-groq-key",
        geminiModel: "gemini-1.5-flash",
        groqModel: "llama-3.3-70b-versatile",
        llmTimeoutMs: 15000,
      };

      const client = createLLMClient(config, {
        fetch: dummyFetch as typeof fetch,
      });
      expect(client).toBeInstanceOf(GroqLLMClient);
    });

    it("throws CONFIGURATION_ERROR when llmProvider is 'groq' but key is missing", () => {
      const config: AppConfig = {
        port: 3000,
        nodeEnv: "test",
        llmProvider: "groq",
        groqApiKey: "",
        geminiModel: "gemini-1.5-flash",
        groqModel: "llama-3.3-70b-versatile",
        llmTimeoutMs: 15000,
      };

      expect(() => createLLMClient(config)).toThrow(LLMClientError);
      try {
        createLLMClient(config);
      } catch (err) {
        expect(err).toBeInstanceOf(LLMClientError);
        expect((err as LLMClientError).code).toBe("CONFIGURATION_ERROR");
        expect((err as LLMClientError).message).toContain("GROQ_API_KEY");
      }
    });

    it("throws CONFIGURATION_ERROR when llmProvider is unknown", () => {
      const config = {
        port: 3000,
        nodeEnv: "test",
        llmProvider: "openai-unsupported",
        geminiModel: "gemini-1.5-flash",
        groqModel: "llama-3.3-70b-versatile",
        llmTimeoutMs: 15000,
      } as unknown as AppConfig;

      expect(() => createLLMClient(config)).toThrow(LLMClientError);
      try {
        createLLMClient(config);
      } catch (err) {
        expect((err as LLMClientError).code).toBe("CONFIGURATION_ERROR");
        expect((err as LLMClientError).message).toContain(
          "Unsupported LLM provider",
        );
      }
    });
  });

  describe("validateConfig startup function", () => {
    it("validates mock provider successfully without any keys", () => {
      expect(() =>
        validateConfig({
          port: 3000,
          nodeEnv: "test",
          llmProvider: "mock",
          geminiModel: "gemini-1.5-flash",
          groqModel: "llama-3.3-70b-versatile",
          llmTimeoutMs: 15000,
        }),
      ).not.toThrow();
    });

    it("validates gemini successfully when key is present", () => {
      expect(() =>
        validateConfig({
          port: 3000,
          nodeEnv: "test",
          llmProvider: "gemini",
          geminiApiKey: "my-key",
          geminiModel: "gemini-1.5-flash",
          groqModel: "llama-3.3-70b-versatile",
          llmTimeoutMs: 15000,
        }),
      ).not.toThrow();
    });

    it("throws clear error when gemini key is missing", () => {
      expect(() =>
        validateConfig({
          port: 3000,
          nodeEnv: "test",
          llmProvider: "gemini",
          geminiModel: "gemini-1.5-flash",
          groqModel: "llama-3.3-70b-versatile",
          llmTimeoutMs: 15000,
        }),
      ).toThrow(/GEMINI_API_KEY/);
    });

    it("throws clear error when groq key is missing", () => {
      expect(() =>
        validateConfig({
          port: 3000,
          nodeEnv: "test",
          llmProvider: "groq",
          geminiModel: "gemini-1.5-flash",
          groqModel: "llama-3.3-70b-versatile",
          llmTimeoutMs: 15000,
        }),
      ).toThrow(/GROQ_API_KEY/);
    });
  });
});
