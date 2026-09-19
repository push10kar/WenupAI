import { LLMClient } from "./LLMClient";
import {
  LLMExtractionInput,
  LLMExtractionResult,
  MockLLMClientConfig,
  ResponseGenerationInput,
} from "./types";
import { selectNextQuestion } from "../../domain/questions";
import { CandidateOperation, AllowedField } from "../../domain/candidate";

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
    const activeField =
      questionResult.status === "QUESTION_AVAILABLE"
        ? questionResult.question.field
        : null;

    // Handle non-answer / refusal for active question
    if (activeField) {
      if (isRefusal(rawText)) {
        return {
          updates: [
            {
              field: activeField,
              value: null,
              status: "REFUSED",
              intent: "NEW",
              confidence: "CLEAR",
            },
          ],
        };
      }

      if (isNonAnswer(rawText)) {
        return {
          updates: [
            {
              field: activeField,
              value: null,
              status: "NOT_PROVIDED",
              intent: "NEW",
              confidence: "CLEAR",
            },
          ],
        };
      }
    }

    const updates: CandidateOperation[] = [];

    // --- 1. Full Name Extraction ---
    if (activeField === "fullName") {
      const value = extractNameFact(rawText);
      updates.push({
        field: "fullName",
        value,
        intent: "NEW",
        confidence: "CLEAR",
      });
    } else if (input.currentState.fullName.status === "UNKNOWN") {
      const nameMatch = rawText.match(
        /(?:my\s+(?:full\s+)?(?:legal\s+)?name\s+is|i\s+am|i'm)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*?)(?:\s+(?:and\s+)?(?:i\s+have|my\s+executor|i\s+live|my\s+address|worldwide)|\s+and\s+|[.,;]|$)/i,
      );
      if (nameMatch && nameMatch[1].trim().length > 0) {
        updates.push({
          field: "fullName",
          value: nameMatch[1]
            .split(/\s+/)
            .filter(Boolean)
            .map(capitalizeWord)
            .join(" "),
          intent: "NEW",
          confidence: "CLEAR",
        });
      }
    } else if (input.currentState.fullName.status === "CONFIRMED") {
      const isNameCorrection =
        /(?:actually|correction|changed|mistake|my real name|correct name)/i.test(
          rawText,
        );
      const nameMatch = rawText.match(
        /(?:my\s+(?:full\s+)?(?:legal\s+)?name\s+is|i\s+am|i'm)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*?)(?:\s+(?:and\s+)?(?:i\s+have|my\s+executor|i\s+live|my\s+address|worldwide)|\s+and\s+|[.,;]|$)/i,
      );
      if (isNameCorrection && nameMatch && nameMatch[1].trim().length > 0) {
        updates.push({
          field: "fullName",
          value: nameMatch[1]
            .split(/\s+/)
            .filter(Boolean)
            .map(capitalizeWord)
            .join(" "),
          intent: "CORRECTION",
          confidence: "CLEAR",
        });
      }
    }

    // --- 2. Children Information Extraction ---
    const hasChildrenNegative =
      /(?:i\s+(?:do\s+not|don't)\s+have|no|none)\s+(?:any\s+)?(?:children|kids)\b/i.test(
        rawText,
      ) ||
      (activeField === "hasChildren" &&
        /^(?:no|none|false|nope|n\b|don't|not\b|no children)/i.test(rawText));

    if (hasChildrenNegative) {
      updates.push({
        field: "hasChildren",
        value: false,
        intent: "NEW",
        confidence: "CLEAR",
      });
      updates.push({
        field: "childrenCount",
        value: 0,
        intent: "NEW",
        confidence: "CLEAR",
      });
    } else {
      const wordToNum: Record<string, number> = {
        one: 1,
        two: 2,
        three: 3,
        four: 4,
        five: 5,
        six: 6,
        seven: 7,
        eight: 8,
        nine: 9,
        ten: 10,
      };
      const countRegex =
        /(?:i\s+have\s+|there\s+are\s+)?(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:children|kids)/i;
      const countMatch = rawText.match(countRegex);

      const hasChildrenAffirmative =
        Boolean(countMatch) ||
        /(?:i\s+have\s+children|i\s+have\s+kids)/i.test(rawText) ||
        (activeField === "hasChildren" &&
          /^(?:yes|true|yep|y\b|i\s+do)/i.test(rawText));

      if (countMatch) {
        const count =
          wordToNum[countMatch[1].toLowerCase()] ?? parseInt(countMatch[1], 10);
        updates.push({
          field: "hasChildren",
          value: true,
          intent: "NEW",
          confidence: "CLEAR",
        });
        updates.push({
          field: "childrenCount",
          value: count,
          intent: "NEW",
          confidence: "CLEAR",
        });
      } else if (hasChildrenAffirmative) {
        updates.push({
          field: "hasChildren",
          value: true,
          intent: "NEW",
          confidence: "CLEAR",
        });
      }

      // Child names and relationships
      const extractedChildren = parseChildrenFromText(rawText, activeField);
      if (extractedChildren.length > 0) {
        if (!updates.some((u) => u.field === "hasChildren")) {
          updates.push({
            field: "hasChildren",
            value: true,
            intent: "NEW",
            confidence: "CLEAR",
          });
        }
        updates.push({
          field: "children",
          value: extractedChildren,
          intent: "NEW",
          confidence: "CLEAR",
        });
        if (!updates.some((u) => u.field === "childrenCount")) {
          updates.push({
            field: "childrenCount",
            value: extractedChildren.length,
            intent: "NEW",
            confidence: "CLEAR",
          });
        }
      } else if (activeField === "children") {
        updates.push({
          field: "children",
          value: ["Sarah Dent", "John Dent"],
          intent: "NEW",
          confidence: "CLEAR",
        });
      }
    }

    // --- 3. Executor Information Extraction ---
    const executorNameRegex =
      /(?:(?:my\s+)?executor\s+(?:is|will\s+be)\s+([A-Za-z\s]+?))(?:\.|$|,|\band\b)/i;
    const executorNameMatch = rawText.match(executorNameRegex);

    const relMatch = rawText.match(
      /(?:my\s+(brother|sister|friend|spouse|wife|husband|son|daughter|cousin)\s+(?:will\s+be\s+my\s+executor|[A-Za-z\s]+\s+is\s+my\s+executor)|my\s+executor\s+is\s+my\s+(brother|sister|friend|spouse|wife|husband|son|daughter|cousin)|^(?:it(?:'s|\s+is)\s+)?(?:my\s+)?(brother|sister|friend|spouse|wife|husband|son|daughter|cousin)[.,!]?$)/i,
    );

    const isRelationshipOnly =
      relMatch !== null &&
      /^(?:it(?:'s|\s+is)\s+)?(?:my\s+)?(?:brother|sister|friend|spouse|wife|husband|son|daughter|cousin)(?:\s+(?:will\s+be\s+my\s+executor|is\s+my\s+executor))?[.,!]?$/i.test(
        rawText.trim(),
      );

    if (executorNameMatch && !isRelationshipOnly) {
      const rawName = executorNameMatch[1].trim();
      const cleanName = rawName
        .replace(
          /^(?:my\s+)?(?:brother|sister|friend|spouse|wife|husband|son|daughter|cousin)\s+/i,
          "",
        )
        .trim();
      if (cleanName.length > 0) {
        updates.push({
          field: "executor.name",
          value: cleanName,
          intent: "NEW",
          confidence: "CLEAR",
        });
      }
    } else if (activeField === "executor.name" && !isRelationshipOnly) {
      const clean = rawText
        .replace(
          /^(?:my executor is|executor is|appointed executor is|it is|it's)\s+/i,
          "",
        )
        .trim();
      const value = clean.length > 0 ? clean : "James Dent";
      updates.push({
        field: "executor.name",
        value,
        intent: "NEW",
        confidence: "CLEAR",
      });
    }

    if (relMatch) {
      const rel = relMatch[1] || relMatch[2] || relMatch[3];
      updates.push({
        field: "executor.relationship",
        value: capitalizeWord(rel),
        intent: "NEW",
        confidence: "CLEAR",
      });
    } else if (activeField === "executor.relationship") {
      const clean = rawText
        .replace(/^(?:he is my|she is my|they are my|my)\s+/i, "")
        .trim();
      const value = clean.length > 0 ? clean : "Brother";
      updates.push({
        field: "executor.relationship",
        value,
        intent: "NEW",
        confidence: "CLEAR",
      });
    }

    // --- 4. Home Address Extraction ---
    const isAddressCorrection =
      /(?:actually|correction|i moved|my new address|changed to|rather than|instead of)/i.test(
        rawText,
      );

    const addressMatch = rawText.match(
      /(?:i\s+live\s+at|my\s+address\s+is|address\s+is|moved\s+to)\s+([^,.]+)/i,
    );
    if (activeField === "homeAddress") {
      const clean = rawText
        .replace(/^(?:i live at|my address is)\s+/i, "")
        .trim();
      const addressClause = clean
        .split(/(?:,|\.|\band\b)\s*(?:i\s+have|my\s+executor|worldwide)/i)[0]
        .trim();
      const value =
        addressClause.length > 0
          ? addressClause
          : "42 Country Lane, Cottington";
      updates.push({
        field: "homeAddress",
        value,
        intent: isAddressCorrection ? "CORRECTION" : "NEW",
        confidence: "CLEAR",
      });
    } else if (
      addressMatch &&
      input.currentState.homeAddress.status === "UNKNOWN"
    ) {
      const cleanAddress = addressMatch[1].replace(/\s+now$/i, "").trim();
      updates.push({
        field: "homeAddress",
        value: cleanAddress,
        intent: "NEW",
        confidence: "CLEAR",
      });
    } else if (
      addressMatch &&
      isAddressCorrection &&
      input.currentState.homeAddress.status === "CONFIRMED"
    ) {
      const cleanAddress = addressMatch[1].replace(/\s+now$/i, "").trim();
      updates.push({
        field: "homeAddress",
        value: cleanAddress,
        intent: "CORRECTION",
        confidence: "CLEAR",
      });
    }

    // --- 5. Worldwide Assets Extraction ---
    const assetsMentioned =
      /(?:worldwide\s+assets|cover\s+worldwide|assets\s+worldwide)/i.test(
        rawText,
      );
    if (activeField === "coversWorldwideAssets") {
      const isAmbiguous =
        /^(?:everything(?:\s+i\s+own)?(?:\s+should\s+be\s+covered)?|all\s+my\s+(?:assets|stuff|property|things)|all\s+of\s+it)[.,!]?$/i.test(
          rawText.trim(),
        );
      if (isAmbiguous) {
        updates.push({
          field: "coversWorldwideAssets",
          value: true,
          intent: "NEW",
          confidence: "AMBIGUOUS",
        });
      } else {
        const isNegative = /^(?:no|false|nope|n\b|don't|not\b)/i.test(rawText);
        updates.push({
          field: "coversWorldwideAssets",
          value: !isNegative,
          intent: "NEW",
          confidence: "CLEAR",
        });
      }
    } else if (
      assetsMentioned &&
      input.currentState.coversWorldwideAssets.status === "UNKNOWN"
    ) {
      const isNegative =
        /(?:not\s+worldwide|no\s+worldwide|don't\s+cover\s+worldwide)/i.test(
          rawText,
        );
      updates.push({
        field: "coversWorldwideAssets",
        value: !isNegative,
        intent: "NEW",
        confidence: "CLEAR",
      });
    }

    // --- 6. Specific Gifts Extraction ---
    if (activeField === "specificGifts") {
      const value =
        rawText.length > 0 ? [rawText] : ["Vintage watch to James Dent"];
      updates.push({
        field: "specificGifts",
        value,
        intent: "NEW",
        confidence: "CLEAR",
      });
    }

    // --- 7. Additional Wishes Extraction ---
    if (activeField === "additionalWishes") {
      const value = rawText.length > 0 ? rawText : "No further wishes";
      updates.push({
        field: "additionalWishes",
        value,
        intent: "NEW",
        confidence: "CLEAR",
      });
    }

    // Deduplicate updates by field
    const seen = new Set<string>();
    const uniqueUpdates: CandidateOperation[] = [];
    for (const op of updates) {
      if (!seen.has(op.field)) {
        seen.add(op.field);
        uniqueUpdates.push(op);
      }
    }

    if (uniqueUpdates.length > 0) {
      return { updates: uniqueUpdates };
    }

    // Fallback: If no facts extracted but question is available
    if (activeField) {
      const fallbackValue = rawText.length > 0 ? rawText : "Confirmed";
      return {
        updates: [
          {
            field: activeField,
            value: fallbackValue,
            intent: "NEW",
            confidence: "CLEAR",
          },
        ],
      };
    }

    // Interview is already complete or no questions remaining
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

function normalizeInputText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function isRefusal(text: string): boolean {
  const norm = normalizeInputText(text);
  const refusalPatterns = [
    /^id rather not(?:.*)?$/,
    /^i would rather not(?:.*)?$/,
    /^prefer not to(?:.*)?$/,
    /^i prefer not to(?:.*)?$/,
    /^refuse to(?:.*)?$/,
    /^i refuse to(?:.*)?$/,
    /^wont provide(?:.*)?$/,
    /^will not provide(?:.*)?$/,
    /^wont give(?:.*)?$/,
    /^will not give(?:.*)?$/,
    /^wont say(?:.*)?$/,
    /^will not say(?:.*)?$/,
    /^dont want to provide(?:.*)?$/,
    /^do not want to provide(?:.*)?$/,
    /^dont want to say(?:.*)?$/,
    /^do not want to say(?:.*)?$/,
    /^private$/,
    /^confidential$/,
    /^no comment$/,
  ];
  return refusalPatterns.some((p) => p.test(norm));
}

export function isNonAnswer(text: string): boolean {
  const norm = normalizeInputText(text);
  const nonAnswerPatterns = [
    /^i dont know(?:.*)?$/,
    /^dont know(?:.*)?$/,
    /^i do not know(?:.*)?$/,
    /^idk$/,
    /^dunno$/,
    /^i dont remember(?:.*)?$/,
    /^dont remember(?:.*)?$/,
    /^i do not remember(?:.*)?$/,
    /^i cant remember(?:.*)?$/,
    /^cant remember(?:.*)?$/,
    /^cannot remember(?:.*)?$/,
    /^im not sure(?:.*)?$/,
    /^i am not sure(?:.*)?$/,
    /^not sure(?:.*)?$/,
    /^unsure$/,
    /^i have no idea(?:.*)?$/,
    /^have no idea(?:.*)?$/,
    /^no idea(?:.*)?$/,
    /^unknown$/,
    /^not provided$/,
    /^none provided$/,
    /^i dont have that information(?:.*)?$/,
    /^dont have that information(?:.*)?$/,
    /^dont have that info(?:.*)?$/,
    /^i dont have that info(?:.*)?$/,
    /^i dont have that(?:.*)?$/,
    /^dont have that(?:.*)?$/,
    /^i dont have one(?:.*)?$/,
    /^dont have one(?:.*)?$/,
    /^i dont have an? address(?:.*)?$/,
    /^dont have an? address(?:.*)?$/,
    /^no address(?:.*)?$/,
    /^na$/,
    /^n\/a$/,
  ];
  return nonAnswerPatterns.some((p) => p.test(norm));
}

/**
 * Extracts only the full legal name fact from a user message, excluding unrelated clauses
 * and ensuring proper capitalization.
 */
function extractNameFact(rawText: string): string {
  // 1. Explicit intro phrase: "My full name is Pushkar Gavade and I have two children."
  const introMatch = rawText.match(
    /(?:my\s+(?:full\s+)?(?:legal\s+)?name\s+is|i\s+am|i'm|call\s+me|name\s+is)\s+([A-Za-z'-]+(?:\s+[A-Za-z'-]+)*?)(?:\s+(?:and\s+)?(?:i\s+have|my\s+executor|i\s+live|my\s+address|worldwide)|\s+and\s+|[.,;]|$)/i,
  );
  if (introMatch && introMatch[1].trim().length > 0) {
    return introMatch[1]
      .split(/\s+/)
      .filter(Boolean)
      .map(capitalizeWord)
      .join(" ");
  }

  // 2. Fact clause isolation: remove known non-name domain clauses
  let isolated = rawText;
  // Remove executor clauses
  isolated = isolated.replace(
    /(?:and\s+)?(?:my\s+)?executor\s+(?:is|will\s+be)\s+[A-Za-z\s'-]+(?:\.|$|,|;)/gi,
    " ",
  );
  // Remove children clauses
  isolated = isolated.replace(
    /(?:and\s+)?(?:i\s+have\s+|there\s+are\s+)?(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:children|kids)[^.,;]*/gi,
    " ",
  );
  isolated = isolated.replace(
    /(?:and\s+)?(?:my\s+)?(?:daughters?|sons?)\s+(?:name\s+is|is)\s+[A-Za-z'-]+(?:\.|$|,|;)/gi,
    " ",
  );
  isolated = isolated.replace(
    /(?:and\s+)?(?:i\s+have\s+no|no|none)\s+(?:children|kids)[^.,;]*/gi,
    " ",
  );
  // Remove address clauses
  isolated = isolated.replace(
    /(?:and\s+)?(?:i\s+live\s+at|my\s+address\s+is)\s+[^.,;]+/gi,
    " ",
  );
  // Clean punctuation and conjunctions
  isolated = isolated.replace(/^[,\s.;]+|[,\s.;]+$/g, "").trim();
  isolated = isolated.replace(/^(?:and|also)\s+/i, "").trim();
  isolated = isolated
    .replace(
      /^(?:my\s+(?:full\s+)?(?:legal\s+)?name\s+is|i\s+am|i'm|call\s+me)\s+/i,
      "",
    )
    .trim();

  // If isolated is non-empty and contains words
  const words = isolated
    .split(/\s+/)
    .filter((w) => w.length > 0 && !/^(?:and|i|have|the|with)$/i.test(w));
  if (words.length > 0) {
    return words.map(capitalizeWord).join(" ");
  }

  return "Arthur Dent";
}

/**
 * Parses children names and relationship labels from user message.
 * - Extracts both names and explicit relationships ("daughter Sarah", "son Bob") and
 *   formats as "Name (daughter)" / "Name (son)".
 * - If only names are stated without relationships ("Sarah and Bob"), returns plain names ["Sarah", "Bob"].
 * - Preserves ambiguity: NEVER invents daughter/son relationships when unstated.
 * - If only count or no names provided ("Yes, I have two children"), returns empty array [].
 */
function parseChildrenFromText(
  text: string,
  activeField?: AllowedField | null,
): string[] {
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

  // Check for names after children/kids, or direct response to "children" question
  const afterChildrenMatch = text.match(
    /(?:children|kids)(?:[,\s]+that\s+are|[,\s]+namely|:|\s+are|[,\s]+(?:named|called)|,)\s*([A-Za-z\s,;]+)/i,
  );
  if (!afterChildrenMatch && activeField !== "children") {
    return [];
  }
  const nameSource = afterChildrenMatch ? afterChildrenMatch[1] : text;

  let cleaned = nameSource
    .replace(
      /^(?:yes[,\s]*)?(?:i\s+have\s+)?(?:\d+|one|two|three|four|five)?\s*(?:children|kids)?(?:[,\s]+that\s+are|[,\s]+namely|:|\s+are|[,\s]+)?/i,
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
      (s) =>
        s.length > 0 &&
        !["Yes", "No", "Children", "Kids", "I", "Have"].includes(s) &&
        !/^\d+$/.test(s),
    );

  return Array.from(new Set(parts));
}
