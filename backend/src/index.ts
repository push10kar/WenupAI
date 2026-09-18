import { app } from "./app";
import { config } from "./config";

const server = app.listen(config.port, () => {
  console.log(
    `Document Intake Assistant Backend listening on port ${config.port} (env: ${config.nodeEnv}, llm: ${config.llmProvider})`,
  );
});

// Graceful shutdown handling
process.on("SIGTERM", () => {
  console.log("SIGTERM signal received: closing HTTP server");
  server.close(() => {
    console.log("HTTP server closed");
  });
});
