import {
  PersonalWishesState,
  Question,
  DocumentPreview,
  ValidationError,
  Conflict,
  TransitionError,
} from "../../domain";
import { LLMClient, Message } from "../../infrastructure";
import { SessionRepository } from "../repositories";

/**
 * Input payload to process a user message turn in the interview.
 */
export interface ProcessMessageInput {
  readonly currentState: PersonalWishesState;
  readonly conversation?: readonly Message[];
  readonly userMessage: string;
}

/**
 * Discriminated union representing the application-level outcome of an interview turn.
 * Ensures caller always receives structured status, untouched state on failure,
 * and comprehensive diagnostic information without leaking low-level details.
 */
export type InterviewResult =
  | {
      readonly status: "QUESTION";
      readonly state: PersonalWishesState;
      readonly question: Question;
      readonly assistantMessage: string;
      readonly document: DocumentPreview;
    }
  | {
      readonly status: "COMPLETE";
      readonly state: PersonalWishesState;
      readonly assistantMessage: string;
      readonly document: DocumentPreview;
    }
  | {
      readonly status: "VALIDATION_ERROR";
      readonly state: PersonalWishesState;
      readonly errors: readonly ValidationError[];
    }
  | {
      readonly status: "CONFLICT";
      readonly state: PersonalWishesState;
      readonly conflicts: readonly Conflict[];
    }
  | {
      readonly status: "TRANSITION_ERROR";
      readonly state: PersonalWishesState;
      readonly errors: readonly TransitionError[];
    }
  | {
      readonly status: "PROVIDER_ERROR";
      readonly state: PersonalWishesState;
      readonly error: Error;
    }
  | {
      readonly status: "PERSISTENCE_ERROR";
      readonly state: PersonalWishesState;
      readonly error: Error;
    };

/**
 * Injected dependencies required by InterviewService.
 */
export interface InterviewServiceDependencies {
  readonly llmClient: LLMClient;
  readonly sessionRepository?: SessionRepository;
}
