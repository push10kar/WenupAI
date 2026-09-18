import {
  LLMExtractionInput,
  LLMExtractionResult,
  ResponseGenerationInput,
} from "./types";

/**
 * Provider-agnostic interface for LLM clients (ARCHITECTURE.md Section 7.8).
 *
 * Implemented by:
 * - MockLLMClient
 * - GeminiLLMClient (future)
 * - GroqLLMClient (future)
 *
 * Guarantees:
 * - Application code depends only on this interface.
 * - Extraction and text response generation remain strictly separate responsibilities.
 * - Provider output is treated as untrusted and must pass validation before state mutation.
 */
export interface LLMClient {
  /**
   * Extracts candidate state updates from user conversational input.
   */
  extractUpdates(input: LLMExtractionInput): Promise<LLMExtractionResult>;

  /**
   * Generates natural language assistant response for the interview.
   */
  generateResponse(input: ResponseGenerationInput): Promise<string>;
}
