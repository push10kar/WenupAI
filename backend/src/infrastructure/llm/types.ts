import { PersonalWishesState } from "../../domain/state";
import { CandidateOperation } from "../../domain/candidate";

/**
 * MessageRole defines who authored a conversation message.
 */
export type MessageRole = "user" | "assistant";

/**
 * Message represents a single message in the intake conversation history (ARCHITECTURE.md Section 5.5).
 */
export interface Message {
  readonly id: string;
  readonly role: MessageRole;
  readonly content: string;
  readonly createdAt: string;
}

/**
 * Input contract for candidate update extraction (ARCHITECTURE.md Section 7.3).
 */
export interface LLMExtractionInput {
  readonly currentState: PersonalWishesState;
  readonly conversation: readonly Message[];
  readonly latestUserMessage: string;
}

/**
 * Output contract for candidate update extraction (ARCHITECTURE.md Section 7.6).
 * Contains proposed updates which are untrusted and must be validated before domain mutation.
 */
export interface LLMExtractionResult {
  readonly updates: readonly CandidateOperation[];
  readonly rawResponse?: string;
}

/**
 * Input contract for natural language assistant response generation (ARCHITECTURE.md Section 7.8).
 */
export interface ResponseGenerationInput {
  readonly currentState: PersonalWishesState;
  readonly conversation: readonly Message[];
  readonly latestUserMessage: string;
  readonly nextQuestionPrompt?: string;
}

/**
 * Configuration options for the deterministic MockLLMClient.
 */
export interface MockLLMClientConfig {
  /**
   * Static or sequential candidate extraction responses.
   */
  readonly extractionResponses?: readonly (LLMExtractionResult | unknown)[];

  /**
   * Static or sequential assistant message responses.
   */
  readonly textResponses?: readonly string[];

  /**
   * Optional initial error to throw on extractUpdates.
   */
  readonly extractionError?: Error;

  /**
   * Optional initial error to throw on generateResponse.
   */
  readonly textError?: Error;

  /**
   * Optional custom deterministic extractor function.
   */
  readonly customExtractor?: (
    input: LLMExtractionInput,
  ) => Promise<LLMExtractionResult> | LLMExtractionResult;

  /**
   * Optional custom deterministic text generator function.
   */
  readonly customTextGenerator?: (
    input: ResponseGenerationInput,
  ) => Promise<string> | string;

  /**
   * Fallback extraction result when response queue is empty.
   */
  readonly defaultExtractionResult?: LLMExtractionResult;

  /**
   * Fallback text response when response queue is empty.
   */
  readonly defaultTextResponse?: string;
}
