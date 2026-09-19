import { LLMClient } from "./LLMClient";
import {
  LLMExtractionInput,
  LLMExtractionResult,
  MockLLMClientConfig,
  ResponseGenerationInput,
} from "./types";
import { selectNextQuestion } from "../../domain/questions";
import { CandidateOperation } from "../../domain/candidate";

type ExtractionQueueItem =
  | { readonly kind: "result"; readonly data: LLMExtractionResult | unknown }
  | { readonly kind: "error"; readonly error: Error };

type TextQueueItem =
  | { readonly kind: "text"; readonly data: string }
  | { readonly kind: "error"; readonly error: Error };

/**
 * Deterministic MockLLMClient for testing and offline execution without external API dependencies.
 *
 * Implements the provider-neutral LLMClient interface.
 *
 * Invariants:
 * 1. Read-only: never mutates input state or conversation history.
 * 2. Untrusted source: returns candidate updates without validating or mutating domain state.
 * 3. Pure determinism: zero network calls, zero timestamps, zero randomness.
 * 4. Configurable: easily simulates valid updates, multiple updates, malformed data, and provider failures.
 */
export class MockLLMClient implements LLMClient {
  private readonly extractionQueue: ExtractionQueueItem[] = [];
  private readonly textQueue: TextQueueItem[] = [];

  private readonly extractionCalls: LLMExtractionInput[] = [];
  private readonly textCalls: ResponseGenerationInput[] = [];

  private customExtractor?: (
    input: LLMExtractionInput,
  ) => Promise<LLMExtractionResult> | LLMExtractionResult;
  private customTextGenerator?: (
    input: ResponseGenerationInput,
  ) => Promise<string> | string;

  private configuredDefaultExtractionResult?: LLMExtractionResult;
  private defaultTextResponse = "Thank you. Your information has been noted.";

  constructor(config?: MockLLMClientConfig) {
    if (config?.defaultExtractionResult !== undefined) {
      this.configuredDefaultExtractionResult = config.defaultExtractionResult;
    }
    if (config?.defaultTextResponse !== undefined) {
      this.defaultTextResponse = config.defaultTextResponse;
    }

    if (config?.customExtractor) {
      this.customExtractor = config.customExtractor;
    }
    if (config?.customTextGenerator) {
      this.customTextGenerator = config.customTextGenerator;
    }

    if (config?.extractionError) {
      this.queueExtractionError(config.extractionError);
    }
    if (config?.textError) {
      this.queueTextError(config.textError);
    }

    if (config?.extractionResponses) {
      for (const res of config.extractionResponses) {
        this.queueExtractionResult(res);
      }
    }

    if (config?.textResponses) {
      for (const text of config.textResponses) {
        this.queueTextResponse(text);
      }
    }
  }

  /**
   * Queues an extraction result to be returned on subsequent extractUpdates call.
   */
  queueExtractionResult(result: LLMExtractionResult | unknown): this {
    this.extractionQueue.push({ kind: "result", data: result });
    return this;
  }

  /**
   * Queues a provider error to be thrown on subsequent extractUpdates call.
   */
  queueExtractionError(error: Error): this {
    this.extractionQueue.push({ kind: "error", error });
    return this;
  }

  /**
   * Queues an assistant response string to be returned on subsequent generateResponse call.
   */
  queueTextResponse(text: string): this {
    this.textQueue.push({ kind: "text", data: text });
    return this;
  }

  /**
   * Queues an error to be thrown on subsequent generateResponse call.
   */
  queueTextError(error: Error): this {
    this.textQueue.push({ kind: "error", error });
    return this;
  }

  /**
   * Extracts candidate updates from user message and context.
   */
  async extractUpdates(
    input: LLMExtractionInput,
  ): Promise<LLMExtractionResult> {
    // Record call defensively (shallow copy to preserve input snapshot)
    this.extractionCalls.push({
      currentState: input.currentState,
      conversation: [...input.conversation],
      latestUserMessage: input.latestUserMessage,
    });

    if (this.extractionQueue.length > 0) {
      const item = this.extractionQueue.shift()!;
      if (item.kind === "error") {
        throw item.error;
      }
      return structuredClone(item.data) as LLMExtractionResult;
    }

    if (this.customExtractor) {
      const result = await this.customExtractor(input);
      return structuredClone(result);
    }

    if (this.configuredDefaultExtractionResult !== undefined) {
      return structuredClone(this.configuredDefaultExtractionResult);
    }

    return this.generateDefaultExtraction(input);
  }

  /**
   * Generates a deterministic, valid CandidateUpdate matching the current unresolved
   * question in the interview sequence.
   */
  private generateDefaultExtraction(
    input: LLMExtractionInput,
  ): LLMExtractionResult {
    const questionResult = selectNextQuestion(input.currentState);
    const rawText = input.latestUserMessage.trim();

    if (questionResult.status === "QUESTION_AVAILABLE") {
      const field = questionResult.question.field;

      switch (field) {
        case "fullName": {
          const clean = rawText
            .replace(/^(?:my name is|i am|i'm|call me)\s+/i, "")
            .trim();
          const value = clean.length > 0 ? clean : "Arthur Dent";
          return {
            updates: [
              {
                field: "fullName",
                value,
                intent: "NEW",
                confidence: "CLEAR",
              },
            ],
          };
        }

        case "homeAddress": {
          const clean = rawText
            .replace(/^(?:i live at|my address is)\s+/i, "")
            .trim();
          const value =
            clean.length > 0 ? clean : "42 Country Lane, Cottington";
          return {
            updates: [
              {
                field: "homeAddress",
                value,
                intent: "NEW",
                confidence: "CLEAR",
              },
            ],
          };
        }

        case "coversWorldwideAssets": {
          const isNegative = /^(?:no|false|nope|n\b|don't|not\b)/i.test(
            rawText,
          );
          const value = !isNegative;
          return {
            updates: [
              {
                field: "coversWorldwideAssets",
                value,
                intent: "NEW",
                confidence: "CLEAR",
              },
            ],
          };
        }

        case "hasChildren": {
          const isNegative =
            /^(?:no|false|none|nope|n\b|don't|not\b|no children)/i.test(
              rawText,
            );
          const hasChildrenValue = !isNegative;
          const updates: CandidateOperation[] = [
            {
              field: "hasChildren",
              value: hasChildrenValue,
              intent: "NEW",
              confidence: "CLEAR",
            },
          ];

          if (hasChildrenValue) {
            const extractedChildren = parseChildrenFromText(rawText);
            if (extractedChildren.length > 0) {
              updates.push({
                field: "children",
                value: extractedChildren,
                intent: "NEW",
                confidence: "CLEAR",
              });
            }
          }

          return { updates };
        }

        case "children": {
          const extractedChildren = parseChildrenFromText(rawText);
          const value =
            extractedChildren.length > 0
              ? extractedChildren
              : ["Sarah Dent", "John Dent"];
          return {
            updates: [
              {
                field: "children",
                value,
                intent: "NEW",
                confidence: "CLEAR",
              },
            ],
          };
        }

        case "executor.name": {
          const clean = rawText
            .replace(
              /^(?:my executor is|executor is|appointed executor is|it is|it's)\s+/i,
              "",
            )
            .trim();
          const value = clean.length > 0 ? clean : "James Dent";
          return {
            updates: [
              {
                field: "executor.name",
                value,
                intent: "NEW",
                confidence: "CLEAR",
              },
            ],
          };
        }

        case "executor.relationship": {
          const clean = rawText
            .replace(/^(?:he is my|she is my|they are my|my)\s+/i, "")
            .trim();
          const value = clean.length > 0 ? clean : "Brother";
          return {
            updates: [
              {
                field: "executor.relationship",
                value,
                intent: "NEW",
                confidence: "CLEAR",
              },
            ],
          };
        }

        case "specificGifts": {
          const value =
            rawText.length > 0 ? [rawText] : ["Vintage watch to James Dent"];
          return {
            updates: [
              {
                field: "specificGifts",
                value,
                intent: "NEW",
                confidence: "CLEAR",
              },
            ],
          };
        }

        case "additionalWishes": {
          const value = rawText.length > 0 ? rawText : "No further wishes";
          return {
            updates: [
              {
                field: "additionalWishes",
                value,
                intent: "NEW",
                confidence: "CLEAR",
              },
            ],
          };
        }
      }
    }

    // Interview is already COMPLETE or all fields confirmed:
    // Update additionalWishes with intent CORRECTION so it passes transition
    const value = rawText.length > 0 ? rawText : "No further wishes";
    return {
      updates: [
        {
          field: "additionalWishes",
          value,
          intent: "CORRECTION",
          confidence: "CLEAR",
        },
      ],
    };
  }

  /**
   * Generates a conversational natural-language response.
   */
  async generateResponse(input: ResponseGenerationInput): Promise<string> {
    // Record call defensively
    this.textCalls.push({
      currentState: input.currentState,
      conversation: [...input.conversation],
      latestUserMessage: input.latestUserMessage,
      nextQuestionPrompt: input.nextQuestionPrompt,
    });

    if (this.textQueue.length > 0) {
      const item = this.textQueue.shift()!;
      if (item.kind === "error") {
        throw item.error;
      }
      return item.data;
    }

    if (this.customTextGenerator) {
      return await this.customTextGenerator(input);
    }

    if (input.nextQuestionPrompt) {
      return input.nextQuestionPrompt;
    }

    return this.defaultTextResponse;
  }

  /**
   * Returns inspection history of all extractUpdates calls made to this mock.
   */
  getExtractionCalls(): readonly LLMExtractionInput[] {
    return this.extractionCalls;
  }

  /**
   * Returns inspection history of all generateResponse calls made to this mock.
   */
  getTextCalls(): readonly ResponseGenerationInput[] {
    return this.textCalls;
  }

  /**
   * Clears queues and call histories.
   */
  reset(): void {
    this.extractionQueue.length = 0;
    this.textQueue.length = 0;
    this.extractionCalls.length = 0;
    this.textCalls.length = 0;
  }
}

function capitalizeWord(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

/**
 * Extracts child names and explicit relationships (daughter/son) from conversational text.
 * Invariants:
 * - If explicit relationships are stated ("my daughter Sarah", "the sons name is Bob"),
 *   formats as "Name (daughter)" / "Name (son)".
 * - If only names are stated without relationships ("Sarah and Bob"), returns plain names ["Sarah", "Bob"].
 * - Preserves ambiguity: NEVER invents daughter/son relationships when unstated.
 * - If only count or no names provided ("Yes, I have two children"), returns empty array [].
 */
function parseChildrenFromText(text: string): string[] {
  const result: string[] = [];

  // 1. Daughter match
  const daughterMatch =
    text.match(
      /(?:(?:the\s+)?daughters?(?:'s)?(?:\s+name)?(?:\s+is)?\s+([A-Za-z]+))/i,
    ) ||
    text.match(/my\s+daughter\s+(?:is\s+)?([A-Za-z]+)/i) ||
    text.match(/([A-Za-z]+)\s+is\s+my\s+daughter/i);

  if (daughterMatch) {
    const name = daughterMatch[1];
    if (
      name &&
      !["is", "the", "my", "name", "a"].includes(name.toLowerCase())
    ) {
      result.push(`${capitalizeWord(name)} (daughter)`);
    }
  }

  // 2. Son match
  const sonMatch =
    text.match(
      /(?:(?:the\s+)?sons?(?:'s)?(?:\s+name)?(?:\s+is)?\s+([A-Za-z]+))/i,
    ) ||
    text.match(/my\s+son\s+(?:is\s+)?([A-Za-z]+)/i) ||
    text.match(/([A-Za-z]+)\s+is\s+my\s+son/i);

  if (sonMatch) {
    const name = sonMatch[1];
    if (
      name &&
      !["is", "the", "my", "name", "a"].includes(name.toLowerCase())
    ) {
      result.push(`${capitalizeWord(name)} (son)`);
    }
  }

  if (result.length > 0) {
    return Array.from(new Set(result));
  }

  // If input is negative, no children
  if (/^(?:no|none|false)/i.test(text.trim()) || /no\s+children/i.test(text)) {
    return [];
  }

  // If no explicit relationship phrases, check if names were given
  let cleaned = text
    .replace(
      /^(?:yes[,\s]*)?(?:i\s+have\s+)?(?:\d+|one|two|three|four|five)?\s*(?:children|kids)(?:[,\s]+that\s+are|[,\s]+namely|:|\s+are|[,\s]+)?/i,
      "",
    )
    .trim();
  cleaned = cleaned.replace(/\.$/, "").trim();

  // If the cleaned text is empty or just says "yes" or numbers or "i have children", no names were provided
  if (
    !cleaned ||
    /^(?:yes|no|none|\d+|one|two|three|i have \d+ children)$/i.test(cleaned)
  ) {
    return [];
  }

  const parts = cleaned
    .split(/,|;|\band\b/i)
    .map((s) => capitalizeWord(s.trim()))
    .filter(
      (s) => s.length > 0 && !["Yes", "No", "Children", "Kids"].includes(s),
    );

  return Array.from(new Set(parts));
}
