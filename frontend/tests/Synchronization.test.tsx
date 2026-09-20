import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import App from "../src/App";
import { sessionApi } from "../src/api";
import { Session, PersonalWishesState } from "../src/types";
import { formatCanonicalStructuredState } from "../src/components/StatePreview";

vi.mock("../src/api", () => {
  class MockApiClientError extends Error {
    readonly code: string;
    constructor(code: string, message: string) {
      super(message);
      this.name = "ApiClientError";
      this.code = code;
    }
  }

  return {
    ApiClientError: MockApiClientError,
    sessionApi: {
      createSession: vi.fn(),
      getSession: vi.fn(),
      sendMessage: vi.fn(),
    },
    configApi: {
      getLLMProvider: vi.fn(async () => "mock"),
    },
  };
});

const createBaseState = (): PersonalWishesState => ({
  fullName: { value: null, status: "UNKNOWN" },
  homeAddress: { value: null, status: "UNKNOWN" },
  coversWorldwideAssets: { value: null, status: "UNKNOWN" },
  hasChildren: { value: null, status: "UNKNOWN" },
  children: [],
  executor: {
    name: { value: null, status: "UNKNOWN" },
    relationship: { value: null, status: "UNKNOWN" },
  },
  specificGifts: [],
  additionalWishes: { value: null, status: "UNKNOWN" },
});

const createTestSession = (state: PersonalWishesState): Session => ({
  id: "test-session-123",
  version: 1,
  createdAt: "2026-09-20T00:00:00.000Z",
  updatedAt: "2026-09-20T00:00:00.000Z",
  messages: [
    {
      id: "msg-1",
      role: "assistant",
      content: "Hello! What is your name?",
      createdAt: "2026-09-20T00:00:00.000Z",
    },
  ],
  state,
  document: {
    title: "Draft Personal Wishes Document",
    subtitle: "Fictional example — Not legal advice",
    status: "draft",
    sections: [],
    content: "Draft content",
  },
});

describe("Phase 08 — UI / State / Document Synchronization Contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.pushState({}, "", "/?view=workspace");
  });

  it("Test 1: Canonical state accurately formats into structured JSON schema and reflects in UI", () => {
    const state = createBaseState();
    const formatted = formatCanonicalStructuredState(state);

    expect(formatted.full_name).toBeNull();
    expect(formatted.covers_worldwide_assets).toBeNull();
    expect(formatted.has_children).toBeNull();
    expect(formatted.executor).toEqual({ name: null, relationship: null });
  });

  it("Test 4 & 5: Ambiguous / conflicted information is not rendered as confirmed document facts", async () => {
    const conflictedState: PersonalWishesState = {
      ...createBaseState(),
      fullName: { value: "Alex Morgan", status: "CONFLICTED" },
      coversWorldwideAssets: { value: true, status: "UNCONFIRMED" },
      hasChildren: { value: true, status: "CONFLICTED" },
      additionalWishes: { value: "Leave photos", status: "UNCONFIRMED" },
    };

    vi.mocked(sessionApi.createSession).mockResolvedValue(
      createTestSession(conflictedState),
    );

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId("column-card-right")).toBeInTheDocument();
    });

    const rightCard = screen.getByTestId("column-card-right");

    // Must NOT present conflicted name as confirmed fact
    expect(rightCard).not.toHaveTextContent("I, Alex Morgan, of");
    expect(rightCard).toHaveTextContent("[Needs clarification: full name]");
    expect(rightCard).toHaveTextContent("[Needs clarification: whether you have children]");
    expect(rightCard).toHaveTextContent("[Needs clarification: additional wishes]");
  });

  it("Test 8: False booleans (coversWorldwideAssets=false, hasChildren=false) are rendered faithfully", async () => {
    const falseBooleanState: PersonalWishesState = {
      ...createBaseState(),
      fullName: { value: "Jane Smith", status: "CONFIRMED" },
      homeAddress: { value: "10 Downing St", status: "CONFIRMED" },
      coversWorldwideAssets: { value: false, status: "CONFIRMED" },
      hasChildren: { value: false, status: "CONFIRMED" },
      executor: {
        name: { value: "James Smith", status: "CONFIRMED" },
        relationship: { value: "Brother", status: "CONFIRMED" },
      },
    };

    vi.mocked(sessionApi.createSession).mockResolvedValue(
      createTestSession(falseBooleanState),
    );

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId("column-card-right")).toBeInTheDocument();
    });

    const rightCard = screen.getByTestId("column-card-right");

    // Boolean false preserved in document
    expect(rightCard).toHaveTextContent("only those assets located in my home country");
    expect(rightCard).toHaveTextContent("I have no children.");

    // Boolean false preserved in structured JSON schema format
    const structured = formatCanonicalStructuredState(falseBooleanState);
    expect(structured.covers_worldwide_assets).toBe(false);
    expect(structured.has_children).toBe(false);
  });

  it("Test 10: Distinctive golden state appears across all projections without stale data", async () => {
    const goldenState: PersonalWishesState = {
      fullName: { value: "Alex Morgan", status: "CONFIRMED" },
      homeAddress: { value: "42 Example Street, Pune", status: "CONFIRMED" },
      coversWorldwideAssets: { value: true, status: "CONFIRMED" },
      hasChildren: { value: true, status: "CONFIRMED" },
      children: [
        { value: "Emma Morgan", status: "CONFIRMED" },
        { value: "Noah Morgan", status: "CONFIRMED" },
      ],
      executor: {
        name: { value: "James Morgan", status: "CONFIRMED" },
        relationship: { value: "Brother", status: "CONFIRMED" },
      },
      specificGifts: [
        { value: "My laptop to Emma", status: "CONFIRMED" },
        { value: "My watch to James", status: "CONFIRMED" },
      ],
      additionalWishes: {
        value: "Keep the family photographs together.",
        status: "CONFIRMED",
      },
    };

    vi.mocked(sessionApi.createSession).mockResolvedValue(
      createTestSession(goldenState),
    );

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId("column-card-right")).toBeInTheDocument();
    });

    const rightCard = screen.getByTestId("column-card-right");

    expect(rightCard).toHaveTextContent("Alex Morgan");
    expect(rightCard).toHaveTextContent("42 Example Street, Pune");
    expect(rightCard).toHaveTextContent("all of my assets, wherever in the world they are located");
    expect(rightCard).toHaveTextContent("Emma Morgan, Noah Morgan");
    expect(rightCard).toHaveTextContent("James Morgan");
    expect(rightCard).toHaveTextContent("Brother");
    expect(rightCard).toHaveTextContent("My laptop to Emma");
    expect(rightCard).toHaveTextContent("My watch to James");
    expect(rightCard).toHaveTextContent("Keep the family photographs together.");
  });
});
