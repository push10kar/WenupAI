import { describe, expect, it } from "vitest";
import { AppConfig, validateConfig } from "../../src/config";
import { createInitialState } from "../../src/domain";
import {
  GeminiLLMClient,
  LLMClientError,
  MockLLMClient,
  OpenRouterLLMClient,
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
        llmTimeoutMs: 15000,
      };

      const client = createLLMClient(config);
      expect(client).toBeInstanceOf(MockLLMClient);
    });

    it("creates OpenRouterLLMClient that targets the configured baseUrl", async () => {
      let capturedUrl: string | null = null;

      const fetchSpy = async (url: Parameters<typeof fetch>[0]) => {
        capturedUrl = String(url);
        return new Response(
          JSON.stringify({
            choices: [{ message: { content: "ok" } }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      };

      const config: AppConfig = {
        port: 3000,
        nodeEnv: "test",
        llmProvider: "openrouter",
        openRouterApiKey: "sk-valid-openrouter-key",
        openRouterModel: "auto",
        geminiModel: "gemini-1.5-flash",
        openRouterBaseUrl: "http://localhost:20128/v1",
        llmTimeoutMs: 15000,
      };

      const client = createLLMClient(config, {
        fetch: fetchSpy as typeof fetch,
      });
      expect(client).toBeInstanceOf(OpenRouterLLMClient);

      const result = await (
        client as unknown as {
          generateResponse: (input: {
            currentState: unknown;
            conversation: unknown[];
            latestUserMessage: string;
            nextQuestionPrompt: string;
          }) => Promise<string>;
        }
      ).generateResponse({
        currentState: createInitialState(),
        conversation: [],
        latestUserMessage: "My name is Arthur",
        nextQuestionPrompt: "What is your name?",
      });

      expect(result).toBe("ok");
      expect(capturedUrl).toBe("http://localhost:20128/v1/chat/completions");
    });

    it("creates GeminiLLMClient when llmProvider is 'gemini' and key is present", () => {
      const config: AppConfig = {
        port: 3000,
        nodeEnv: "test",
        llmProvider: "gemini",
        geminiApiKey: "valid-gemini-key",
        geminiModel: "gemini-1.5-flash",
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

    it("creates OpenRouterLLMClient when llmProvider is 'openrouter' and key is present", () => {
      const config: AppConfig = {
        port: 3000,
        nodeEnv: "test",
        llmProvider: "openrouter",
        openRouterApiKey: "sk-valid-openrouter-key",
        openRouterModel: "openrouter/free",
        geminiModel: "gemini-1.5-flash",
        llmTimeoutMs: 15000,
      };

      const client = createLLMClient(config, {
        fetch: dummyFetch as typeof fetch,
      });
      expect(client).toBeInstanceOf(OpenRouterLLMClient);
    });

    it("throws CONFIGURATION_ERROR when llmProvider is 'openrouter' but key is missing", () => {
      const config: AppConfig = {
        port: 3000,
        nodeEnv: "test",
        llmProvider: "openrouter",
        openRouterApiKey: "",
        geminiModel: "gemini-1.5-flash",
        llmTimeoutMs: 15000,
      };

      expect(() => createLLMClient(config)).toThrow(LLMClientError);
      try {
        createLLMClient(config);
      } catch (err) {
        expect(err).toBeInstanceOf(LLMClientError);
        expect((err as LLMClientError).code).toBe("CONFIGURATION_ERROR");
        expect((err as LLMClientError).message).toContain(
          "OPENROUTER_API_KEY",
        );
      }
    });

    it("throws CONFIGURATION_ERROR when llmProvider is unknown", () => {
      const config = {
        port: 3000,
        nodeEnv: "test",
        llmProvider: "openai-unsupported",
        geminiModel: "gemini-1.5-flash",
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
          llmTimeoutMs: 15000,
        }),
      ).toThrow(/GEMINI_API_KEY/);
    });

    it("validates openrouter successfully when key is present", () => {
      expect(() =>
        validateConfig({
          port: 3000,
          nodeEnv: "test",
          llmProvider: "openrouter",
          openRouterApiKey: "sk-my-key",
          openRouterModel: "openrouter/free",
          geminiModel: "gemini-1.5-flash",
          llmTimeoutMs: 15000,
        }),
      ).not.toThrow();
    });

    it("throws clear error when openrouter key is missing", () => {
      expect(() =>
        validateConfig({
          port: 3000,
          nodeEnv: "test",
          llmProvider: "openrouter",
          openRouterModel: "openrouter/free",
          geminiModel: "gemini-1.5-flash",
          llmTimeoutMs: 15000,
        }),
      ).toThrow(/OPENROUTER_API_KEY/);
    });
  });
});
