import "../../src/infrastructure/db/sqliteWarning";

/**
 * Test-suite environment bootstrap.
 *
 * Forces the LLM provider to MockLLM so backend tests remain fully
 * deterministic and never depend on a real provider API key present in
 * the local .env file. dotenv.config() never overrides process.env, so
 * these values win over any .env contents.
 */
process.env.LLM_PROVIDER = "mock";
process.env.NODE_ENV = "test";
process.env.OPENROUTER_API_KEY = "";
process.env.GEMINI_API_KEY = "";