import { createApp } from "./api";
import { config, validateConfig } from "./config";

// Validate environment configuration for the selected LLM provider at startup
validateConfig(config);

const app = createApp();

const start = async () => {
  try {
    await app.listen({ port: config.port, host: "0.0.0.0" });
    console.log(
      `Document Intake Assistant listening on port ${config.port} (env: ${config.nodeEnv}, llm: ${config.llmProvider})`,
    );
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
};

start();
