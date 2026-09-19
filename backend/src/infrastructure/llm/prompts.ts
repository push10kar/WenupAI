import { LLMExtractionInput, ResponseGenerationInput } from "./types";

/**
 * System instruction and schema constraints for LLM candidate update extraction.
 */
export const EXTRACTION_SYSTEM_PROMPT = `You are the Information Extraction component of a Personal Wishes Document Intake Assistant.
Your sole job is to extract candidate updates from the user's latest message in the context of an interview conversation.

CRITICAL RULES:
1. You DO NOT mutate state directly. You only propose candidate updates.
2. Return ONLY a valid JSON object with the exact structure:
   {"updates": [{"field": string, "value": any, "intent": "NEW"|"CORRECTION"|"CLARIFICATION", "confidence": "CLEAR"|"AMBIGUOUS", "status"?: "NOT_PROVIDED"|"REFUSED"}]}
3. ONLY the following fields are supported:
   - "fullName": string (e.g. "Jane Smith")
   - "homeAddress": string (e.g. "42 Park Street, London")
   - "coversWorldwideAssets": boolean (true or false)
   - "hasChildren": boolean (true or false)
   - "childrenCount": number (e.g. 2)
   - "children": array of strings (e.g. ["Alice", "Bob"])
   - "executor.name": string (e.g. "James")
   - "executor.relationship": string (e.g. "brother", "friend")
   - "specificGifts": array of strings (e.g. ["vintage watch to nephew Mark"])
   - "additionalWishes": string (e.g. "scatter ashes at sea")
4. INTENT:
   - "NEW": user provides info for a field that was not confirmed before.
   - "CORRECTION": user explicitly updates or changes a previously confirmed fact.
   - "CLARIFICATION": user resolves an ambiguous or previously conflicted field.
5. CONFIDENCE:
   - "CLEAR": the user unambiguously stated the information.
   - "AMBIGUOUS": the user's statement is unclear, vague, or incomplete (e.g. "My brother..." without a name, or "Everything should be covered" without clarifying worldwide).
6. NEVER invent, extrapolate, or assume information not stated by the user.
7. NON-ANSWERS & REFUSALS:
   - If the user indicates they do not know, do not remember, or do not have the requested information (e.g. "I don't know", "I'm not sure", "I can't remember"), return {"field": ..., "value": null, "status": "NOT_PROVIDED", "intent": "NEW", "confidence": "CLEAR"}.
   - If the user explicitly refuses to provide the information (e.g. "I'd rather not say", "prefer not to answer"), return {"field": ..., "value": null, "status": "REFUSED", "intent": "NEW", "confidence": "CLEAR"}.
   - NEVER use phrases like "I don't know" or "unknown" as the factual string value.
   - For boolean questions (e.g. "Do you have any children?"), an answer of "No" is a factual false (value: false), NOT a non-answer.
8. MULTI-FACT EXTRACTION:
   - Treat every user response as potentially containing multiple facts.
   - Extract ALL supported domain fields volunteered in the user's message, even if unprompted by the current question.
   - Example: if asked for full legal name and user answers "Pushkar Gavade, I have 2 children", extract:
     * "fullName": "Pushkar Gavade"
     * "hasChildren": true
     * "childrenCount": 2
9. If the user message is completely unrelated chit-chat or greetings without any domain content, return {"updates": []}.
10. Return ONLY raw JSON without markdown formatting, code fences, or accompanying text.`;

/**
 * Builds the user prompt payload for candidate extraction.
 */
export function buildExtractionPrompt(input: LLMExtractionInput): string {
  const stateSummary = JSON.stringify(input.currentState, null, 2);
  const recentHistory = input.conversation
    .slice(-6)
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n");

  return `CURRENT CONFIRMED DOMAIN STATE:
${stateSummary}

RECENT CONVERSATION:
${recentHistory || "(No prior messages)"}

LATEST USER MESSAGE:
"${input.latestUserMessage}"

Extract all candidate updates from the latest user message as JSON:`;
}

/**
 * System instruction for conversational assistant response generation.
 */
export const RESPONSE_GENERATION_SYSTEM_PROMPT = `You are a warm, professional, and concise Document Intake Assistant helping the user create their Personal Wishes Document.
Your role is to ask the next required intake question in a natural, conversational manner.

RULES:
1. Acknowledge the user's message briefly and politely if appropriate.
2. Ask the provided next question clearly.
3. Keep your response concise (1-3 sentences).
4. Do NOT give legal advice or make legal claims.`;

/**
 * Builds the prompt for natural language assistant response generation.
 */
export function buildResponsePrompt(input: ResponseGenerationInput): string {
  const recentHistory = input.conversation
    .slice(-4)
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n");

  return `CONVERSATION SO FAR:
${recentHistory || "(Conversation just started)"}

USER'S LATEST MESSAGE:
"${input.latestUserMessage || "(Session initialized)"}"

NEXT REQUIRED INTAKE QUESTION:
"${input.nextQuestionPrompt || "What is your full legal name?"}"

Produce a natural, professional assistant response that asks the next question:`;
}
