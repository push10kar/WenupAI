import express, { Request, Response, NextFunction } from "express";
import cors from "cors";

export const app = express();

// Global middlewares
app.use(cors());
app.use(express.json());

// Health check endpoint (Milestone 01 requirement)
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

// 404 handler adhering to the API Error Contract from ARCHITECTURE.md
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: "Resource not found",
    },
  });
});

// Centralized error handler adhering to ARCHITECTURE.md
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  // Safe internal server error response
  res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message:
        process.env.NODE_ENV === "production"
          ? "An unexpected error occurred"
          : err.message,
    },
  });
});
