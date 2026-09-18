import {
  PersonalWishesState,
  createInitialState,
  validateCandidate,
  detectConflicts,
  applyCandidateUpdate,
  selectNextQuestion,
  generateDocument,
} from "../../domain";
import { LLMClient, Message } from "../../infrastructure";
import {
  InterviewResult,
  InterviewServiceDependencies,
  ProcessMessageInput,
} from "./types";

/**
 * Application-level Interview Service orchestrating the conversational intake workflow.
 *
 * Architecture (ARCHITECTURE.md Section 9.6):
 * 1. LLMClient (extract candidates)
 * 2. Phase 3 Validation (parse, schema, semantic)
 * 3. Phase 5 Conflict Detection (cross-field, same-candidate, state-value)
 * 4. Phase 4 State Transition (deterministic mutation)
 * 5. Phase 6 Question Selection (next unresolved question or complete)
 * 6. Phase 7 Document Generation (deterministic draft projection)
 * 7. LLMClient (assistant response generation)
 *
 * Invariants:
 * - Application orchestrator only: domain logic lives strictly in domain modules.
 * - Invariant 1: If any stage fails, canonical state remains untouched.
 * - Invariant 2: Candidate updates from LLM are untrusted and must pass validation.
 * - Invariant 3: Stateless with respect to persistence (persistence handled in Phase 10).
 */
export class InterviewService {
  private readonly llmClient: LLMClient;

  constructor(dependencies: InterviewServiceDependencies) {
    this.llmClient = dependencies.llmClient;
  }

  /**
   * Initializes or resumes an interview from a given state, selecting the first
   * question and preparing the initial document preview.
   */
  async startInterview(
    initialState?: PersonalWishesState,
  ): Promise<InterviewResult> {
    const state = initialState ?? createInitialState();
    const questionResult = selectNextQuestion(state);
    const document = generateDocument(state);

    if (questionResult.status === "COMPLETE") {
      const completionPrompt =
        "All required information has been collected. Your draft personal wishes document is ready.";
      const assistantMessage = await this.safeGenerateResponse({
        currentState: state,
        conversation: [],
        latestUserMessage: "",
        nextQuestionPrompt: completionPrompt,
      });

      return {
        status: "COMPLETE",
        state,
        assistantMessage,
        document,
      };
    }

    const assistantMessage = await this.safeGenerateResponse({
      currentState: state,
      conversation: [],
      latestUserMessage: "",
      nextQuestionPrompt: questionResult.question.prompt,
    });

    return {
      status: "QUESTION",
      state,
      question: questionResult.question,
      assistantMessage,
      document,
    };
  }

  /**
   * Orchestrates a single message turn in the interview.
   *
   * Guaranteed:
   * - If extraction, validation, conflict detection, or state transition fails:
   *   the input currentState is returned unchanged.
   * - Never partially mutates state.
   */
  async processMessage(input: ProcessMessageInput): Promise<InterviewResult> {
    const currentState = input.currentState;
    const conversation = input.conversation ?? [];
    const userMessage = input.userMessage;

    // Stage 1: Extract candidate updates from user message using injected LLMClient
    let rawExtraction: unknown;
    try {
      rawExtraction = await this.llmClient.extractUpdates({
        currentState,
        conversation,
        latestUserMessage: userMessage,
      });
    } catch (err) {
      return {
        status: "PROVIDER_ERROR",
        state: currentState,
        error: err instanceof Error ? err : new Error(String(err)),
      };
    }

    // Stage 2: Validate untrusted candidate output (Phase 3)
    const validationResult = validateCandidate(rawExtraction, currentState);
    if (!validationResult.success) {
      return {
        status: "VALIDATION_ERROR",
        state: currentState,
        errors: validationResult.errors,
      };
    }

    // Stage 3: Deterministic Conflict Detection (Phase 5)
    const conflictResult = detectConflicts(
      currentState,
      validationResult.candidate,
    );
    if (conflictResult.hasConflicts) {
      return {
        status: "CONFLICT",
        state: currentState,
        conflicts: conflictResult.conflicts,
      };
    }

    // Stage 4: Deterministic State Transition (Phase 4)
    const transitionResult = applyCandidateUpdate(
      currentState,
      validationResult.candidate,
    );
    if (!transitionResult.success) {
      return {
        status: "TRANSITION_ERROR",
        state: currentState,
        errors: transitionResult.errors,
      };
    }

    const nextState = transitionResult.state;

    // Stage 5: Deterministic Question Selection (Phase 6)
    const questionResult = selectNextQuestion(nextState);

    // Stage 6: Deterministic Document Generation (Phase 7)
    const document = generateDocument(nextState);

    // Stage 7: Assistant Response Generation
    if (questionResult.status === "COMPLETE") {
      const completionPrompt =
        "All required information has been collected. Your draft personal wishes document is ready.";
      const assistantMessage = await this.safeGenerateResponse({
        currentState: nextState,
        conversation,
        latestUserMessage: userMessage,
        nextQuestionPrompt: completionPrompt,
      });

      return {
        status: "COMPLETE",
        state: nextState,
        assistantMessage,
        document,
      };
    }

    const assistantMessage = await this.safeGenerateResponse({
      currentState: nextState,
      conversation,
      latestUserMessage: userMessage,
      nextQuestionPrompt: questionResult.question.prompt,
    });

    return {
      status: "QUESTION",
      state: nextState,
      question: questionResult.question,
      assistantMessage,
      document,
    };
  }

  /**
   * Resilient assistant response generation falling back to the canonical question prompt
   * if provider text generation fails or returns empty.
   */
  private async safeGenerateResponse(params: {
    currentState: PersonalWishesState;
    conversation: readonly Message[];
    latestUserMessage: string;
    nextQuestionPrompt: string;
  }): Promise<string> {
    try {
      const text = await this.llmClient.generateResponse(params);
      if (typeof text === "string" && text.trim().length > 0) {
        return text;
      }
      return params.nextQuestionPrompt;
    } catch {
      return params.nextQuestionPrompt;
    }
  }
}
