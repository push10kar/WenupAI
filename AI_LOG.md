# AI Log — Document Intake Assistant

Keeping this as honest as possible. I used Claude and Gemini throughout. Some of this is copy-pasted from my chat history, some is reconstructed from memory.

---

## Early architecture decisions

My first instinct was to just dump the whole conversation history into the LLM and ask it to produce the document directly. Asked Claude something like:

> "I'm building a personal wishes document assistant. The user chats with the AI, and at the end I want to generate a document. What's the simplest approach?"
>
> Claude suggested keeping a state object separately and having the LLM only update specific fields. That felt right because if you rely on the LLM to remember everything across turns you're going to get hallucinations. So I went with a domain state object (`PersonalWishesState`) as the single source of truth and the LLM only ever proposes _candidate_ updates.
>
> That was probably the best decision I made early on. Everything else follows from it.

---

## Extraction prompt — first attempt

My first extraction prompt was something like:

> "You are helping collect information for a personal wishes document. Given this conversation, extract any relevant information the user has provided and return it as JSON."

The output was all over the place. Sometimes it returned:

```json
{ "fullName": "Jane Smith", "executor": "James" }
```

sometimes nested, sometimes flat, sometimes with extra fields I hadn't asked for. No consistency.

I started constraining the schema a lot more — explicitly listing every allowed field, specifying exactly what the JSON structure should look like, and adding `ONLY the following fields are supported`. That helped but the model kept smuggling in extra stuff.

Eventually landed on:

```
Return ONLY a valid JSON object with the exact structure:
{"updates": [{"field": string, "value": any, "intent": "NEW"|"CORRECTION"|"CLARIFICATION", "confidence": "CLEAR"|"AMBIGUOUS"}]}
```

Using an `updates` array instead of a flat object was key — it means the model returns operations, not values directly. Easier to validate.

---

## The "don't copy the whole sentence" problem

One thing that annoyed me for a while: when I asked "what is your full name?" and the user said "My name is Rahul Sharma and I have two kids", the model kept returning:

```json
{ "field": "fullName", "value": "My name is Rahul Sharma and I have two kids" }
```

Like, it was just copying the entire user message as the value. I had to be very explicit:

> "FACT EXTRACTION, NOT ANSWER COPYING: value MUST represent ONLY the relevant factual value for that specific domain field. NEVER copy the user's entire response."

Had to add an example in the prompt itself because it kept happening. After adding the example with "pushkar gavade, i have 2 children" → `"Pushkar Gavade"` it mostly stopped.

---

## Non-answer handling

Took me a while to think through what "I don't know" means for different fields.

For a boolean like `hasChildren`, "No" is a valid answer (false). But "I don't know if I have children" is a non-answer. And "I'd rather not say" is a refusal. Those three should be treated differently.

I almost got this wrong — my first instinct was to just treat non-answers as nulls. But then the question engine would keep asking the same question forever. Ended up adding explicit `NOT_PROVIDED` and `REFUSED` statuses to the field schema. If something is `NOT_PROVIDED`, the question engine moves on. If it's `REFUSED`, same thing. This part of the prompt took a few iterations:

> "For boolean questions (e.g. 'Do you have any children?'), an answer of 'No' is a factual false (value: false), NOT a non-answer."

That line specifically came from a bug where the user said "No" to children and the system treated it as a non-answer and kept asking.

---

## The second specific gift disappearing — the worst bug

This one took me embarrassingly long to find.

The scenario: user gives two specific gifts in two separate messages. After confirming the first gift, the question engine marked `specificGifts` as resolved (because one confirmed gift exists) and moved to asking about `additionalWishes`. Then when the user said "I want my watch to go to James", the system was in `additionalWishes` mode so it stored that as an additional wish, not a gift. Then when the user said "Please keep the family photographs together", it overwrote the previous additional wish.

Result: second gift disappeared, additional wish was wrong.

Fix was adding a regex guard — if the message pattern matches a gift intent (`"I want my X to go to Y"`, `"leave my X to Y"`, etc.), route it to `specificGifts` regardless of what field the question engine thinks it's asking about. `additionalWishes` also got a guard to not consume gift-shaped sentences.

The regex took a few tries to get right because English is annoying:

```
/(?:i\s+want\s+(?:my\s+)?|leave\s+(?:my\s+)?|gift\s+(?:my\s+)?|give\s+(?:my\s+)?)[^.]+?\s+to\s+[A-Za-z]/i
```

Not beautiful but it works. Added a specific regression test for this exact scenario.

---

## Mock client vs real LLM

I built the mock client first so tests wouldn't hit real APIs. The mock uses regex-based extraction — it pattern matches on common phrasings. This is obviously not how a real LLM works, but it gave me deterministic tests.

The hard part was making the mock realistic enough that tests were actually useful. If the mock is too simple it passes tests that a real LLM would fail. If it's too clever it becomes a second LLM.

Ended up using the mock for unit/integration tests and writing a separate test file for validating that the real provider path through the code doesn't break things structurally.

---

## The fullName guard — surprising edge case

There was a bug where messages like "My executor is my brother James Sharma" were being picked up as the user's name. The regex was too greedy — it was finding "James Sharma" in the executor sentence and routing it to `fullName`.

I questioned this output from the mock:

```
User: "My executor is my brother James Sharma"
Mock extracted: { field: "fullName", value: "James Sharma" }
```

That's clearly wrong. Fixed it by adding guards: if the message starts with `"My executor"`, `"I live at"`, `"I have"`, etc., don't extract it as `fullName` even if the current active field is `fullName`.

---

## Question about whether to send system prompt as user message

Initially I was concatenating the system prompt into the user message when calling Gemini's API, like:

```
user: [system prompt text] + [actual user prompt]
```

Realised later Gemini has a proper `systemInstruction` field at the top level. Switched to using that. The model follows the JSON format constraint more reliably when it's in `systemInstruction` vs crammed into the user turn. Makes sense — that's what it's for.

---

## What I asked AI tools to help with

Things I used AI for:

- Initial architecture brainstorming (mostly Claude)
- Zod schema design for `CandidateOperation` validation
- Fastify route structure
- SQLite setup with Node's built-in `node:sqlite` module
- Debugging the specific gift disappearing bug (explained the issue to Claude, it helped me trace through the control flow)
- Writing most of the test cases for the 40-scenario suite — I gave it the scenario descriptions and it helped generate the test scaffolding, then I reviewed and fixed the ones that were wrong

Things I did not use AI for:

- The actual state machine logic (I needed to understand this myself)
- Debugging the name extraction guard (AI suggestions kept making it worse, just traced it manually)
- The `isGiftPattern` regex (tried AI-generated ones, they missed edge cases, wrote it myself)

---

## Output I questioned

When I first asked Claude to help design the validation pipeline, it suggested validating LLM output with a try/catch and just logging failures. I pushed back on this — I wanted structured error codes, not just console.log and move on. It revised to a proper `LLMClientError` class with typed error codes (`PROVIDER_TIMEOUT`, `MALFORMED_OUTPUT`, etc.) which is much more useful for the frontend to handle gracefully.

Also, early on the AI suggested keeping conversation history as the state and "re-parsing" it on every turn to derive the document. I specifically didn't do this because it's exactly what the brief is testing for — you can't rely on the LLM to correctly reparse its own conversation every time. That approach breaks as soon as the model makes one mistake.

---

## Things I'd do differently

- The mock client grew too large. It's nearly 1000 lines of regex-based extraction. For a real project I'd use fixture files instead.
- The extraction prompt has gotten long with all the edge case rules. Ideally I'd split "extraction rules" from "field definitions" more cleanly.
- I didn't build streaming. The response generation call blocks until done. Fine for a demo but not for real use.
- No retry logic on transient LLM errors (rate limit, 5xx). Easy to add, just ran out of time.

## What Could Be Better

- **Streaming responses** — right now it waits for the full LLM response before showing anything. Streaming would feel faster.
- **Auth** — sessions are just UUIDs in localStorage. Real auth would let users resume across devices.
- **Better database** — SQLite works fine for dev but Postgres would be needed for production.
- **PDF export** — people probably want to print or share their document.
- **Retry with backoff** — the fallback handles quota errors, but a proper retry strategy with exponential backoff would be more robust.
