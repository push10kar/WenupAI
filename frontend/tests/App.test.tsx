import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import App from "../src/App";
import { sessionApi } from "../src/api";
import { Session } from "../src/types";

// Mock sessionApi module
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

describe("Two-Page Flow & Workspace Card", () => {
  const createInitialSession = (): Session => ({
    id: "session-1",
    version: 1,
    createdAt: "2026-09-19T00:00:00.000Z",
    updatedAt: "2026-09-19T00:00:00.000Z",
    messages: [
      {
        id: "msg-1",
        role: "assistant",
        content:
          "Hello! To begin preparing your personal wishes document, what is your full legal name?",
        createdAt: "2026-09-19T00:00:00.000Z",
      },
    ],
    state: {
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
    },
    document: {
      title: "Draft Personal Wishes Document",
      subtitle: "Fictional example — Not legal advice",
      status: "draft",
      sections: [
        {
          title: "1. Identification",
          content: "No identification information confirmed yet.",
        },
      ],
      content: "Draft content",
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    window.history.pushState({}, "", "/");
  });

  describe("Landing Page Default on Entry and Reload", () => {
    it("renders the Landing Page by default when entered or reloaded", async () => {
      vi.mocked(sessionApi.createSession).mockResolvedValue(
        createInitialSession(),
      );

      render(<App />);

      expect(screen.getByText("Document Intake Assistant")).toBeInTheDocument();
      expect(screen.getByText(/Turn conversation/i)).toBeInTheDocument();
      expect(screen.getByText("Enter Workspace")).toBeInTheDocument();

      await waitFor(() => {
        expect(sessionApi.createSession).toHaveBeenCalled();
      });
    });

    it("takes the user to the landing page on browser reload even if URL previously had workspace query", async () => {
      vi.mocked(sessionApi.createSession).mockResolvedValue(
        createInitialSession(),
      );

      window.history.pushState({}, "", "/?view=workspace");

      // Mock performance navigation timing for reload
      const originalGetEntriesByType = window.performance.getEntriesByType;
      window.performance.getEntriesByType = vi
        .fn()
        .mockImplementation((type: string) => {
          if (type === "navigation") {
            return [{ type: "reload" } as PerformanceNavigationTiming];
          }
          return [];
        });

      await act(async () => {
        render(<App />);
      });

      expect(screen.getByText("Document Intake Assistant")).toBeInTheDocument();
      expect(screen.queryByTestId("workspace-card")).not.toBeInTheDocument();

      await waitFor(() => {
        expect(sessionApi.createSession).toHaveBeenCalled();
      });

      // Clean up mock
      window.performance.getEntriesByType = originalGetEntriesByType;
    });

    it("enters workspace showing only the card with thick borders", async () => {
      vi.mocked(sessionApi.createSession).mockResolvedValue(
        createInitialSession(),
      );

      render(<App />);

      const enterButton = screen.getByText("Enter Workspace");
      fireEvent.click(enterButton);

      await waitFor(() => {
        expect(screen.getByTestId("workspace-card")).toBeInTheDocument();
      });

      // The card has thick border and starts in dark mode matching Screenshot 1
      const card = screen.getByTestId("workspace-card");
      expect(card).toHaveStyle({ border: "6px solid #4E1FBE" });
      expect(card).toHaveClass("dark");
      expect(card).toHaveClass("bg-[#0a0a0a]");

      // New session button exists on the left of the theme toggle button
      const newSessionButton = screen.getByTestId("new-session-button");
      expect(newSessionButton).toBeInTheDocument();
      expect(screen.getByText("New session")).toBeInTheDocument();

      // Theme toggle button toggles dark and light mode
      const toggleButton = screen.getByTestId("theme-toggle-button");
      expect(toggleButton).toBeInTheDocument();
      expect(screen.getByText("Light mode")).toBeInTheDocument();

      // Click to toggle to Light mode
      fireEvent.click(toggleButton);
      expect(card).not.toHaveClass("dark");
      expect(card).toHaveClass("bg-white");
      expect(screen.getByText("Dark mode")).toBeInTheDocument();

      // Click again to toggle back to Dark mode
      fireEvent.click(toggleButton);
      expect(card).toHaveClass("dark");
      expect(card).toHaveClass("bg-[#0a0a0a]");
      expect(screen.getByText("Light mode")).toBeInTheDocument();

      // Real conversation: initial question from assistant is rendered
      expect(
        screen.getByText(/what is your full legal name/i),
      ).toBeInTheDocument();

      // MessageHeader sender names are rendered
      expect(screen.getByText("Intake assistant")).toBeInTheDocument();

      // Custom avatar fallbacks are rendered in jsdom
      expect(screen.getByText("IA")).toBeInTheDocument();

      // Two side-by-side column cards with thick purple borders — now populated with live previews
      const leftCard = screen.getByTestId("column-card-left");
      const rightCard = screen.getByTestId("column-card-right");
      expect(leftCard).toBeInTheDocument();
      expect(rightCard).toBeInTheDocument();
      expect(leftCard).toHaveStyle({ border: "6px solid #4E1FBE" });
      expect(rightCard).toHaveStyle({ border: "6px solid #4E1FBE" });
      expect(leftCard.parentElement).toHaveClass("w-[46%]");
      expect(rightCard.parentElement).toHaveClass("w-[52%]");

      // Left card shows live structured state (StatePreview)
      expect(leftCard).toHaveTextContent("Collected Information");
      expect(leftCard).toHaveTextContent("Personal Details");

      // Right card shows draft document (DocumentPreview)
      expect(rightCard).toHaveTextContent("1. Executor");

      // Minimal send message input component is rendered in the bottom part of the card
      const messageInput = screen.getByPlaceholderText("Message");
      expect(messageInput).toBeInTheDocument();

      const sendButton = screen.getByRole("button", { name: "Send" });
      expect(sendButton).toBeInTheDocument();
      expect(sendButton).toBeDisabled();

      // Typing in the input enables the send button
      fireEvent.change(messageInput, { target: { value: "Jane Doe" } });
      expect(sendButton).not.toBeDisabled();

      const assistantReply = {
        id: "msg-assistant-2",
        role: "assistant" as const,
        content: "Thank you Jane Doe. What is your home address?",
        createdAt: "2026-09-19T00:01:01.000Z",
      };

      // Mock sendMessage response
      vi.mocked(sessionApi.sendMessage).mockResolvedValue({
        session: {
          ...createInitialSession(),
          messages: [
            ...createInitialSession().messages,
            {
              id: "msg-user-1",
              role: "user" as const,
              content: "Jane Doe",
              createdAt: "2026-09-19T00:01:00.000Z",
            },
            assistantReply,
          ],
        },
        assistantMessage: assistantReply,
      });

      // Submit message
      fireEvent.click(sendButton);

      // User's response is rendered immediately (optimistic UI update)
      expect(screen.getByText("Jane Doe")).toBeInTheDocument();

      await waitFor(() => {
        expect(sessionApi.sendMessage).toHaveBeenCalledWith(
          "session-1",
          "Jane Doe",
        );
      });

      // User's response and follow-up question are rendered
      await waitFor(() => {
        expect(screen.getByText("Jane Doe")).toBeInTheDocument();
        expect(
          screen.getByText(/What is your home address/i),
        ).toBeInTheDocument();
      });

      // Also test sending message via Enter key on keyboard
      fireEvent.change(messageInput, {
        target: { value: "123 Maple Street, London" },
      });
      fireEvent.submit(messageInput.closest("form")!);

      await waitFor(() => {
        expect(sessionApi.sendMessage).toHaveBeenCalledWith(
          "session-1",
          "123 Maple Street, London",
        );
      });
    });

    it("shows a lime LLM provider badge on the conversation card", async () => {
      vi.mocked(sessionApi.createSession).mockResolvedValue(
        createInitialSession(),
      );

      render(<App />);

      // Enter workspace
      fireEvent.click(screen.getByText("Enter Workspace"));
      await waitFor(() => {
        expect(screen.getByTestId("workspace-card")).toBeInTheDocument();
      });

      // The active provider (mocked as "mock") is displayed in the badge
      const badge = screen.getByTestId("llm-provider-badge");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent("MockLLM");
      expect(badge).toHaveClass("bg-[#eaff57]");
      expect(badge).toHaveStyle({ border: "1px dashed rgba(78, 31, 190, 0.5)" });
      expect(badge).toHaveStyle({
        outline: "1px dashed rgba(78, 31, 190, 0.8)",
      });
    });
  });

  describe("Workspace Navigation & Returning to Landing Page", () => {
    it("returns to Landing Page on browser popstate (native back button)", async () => {
      vi.mocked(sessionApi.createSession).mockResolvedValue(
        createInitialSession(),
      );

      render(<App />);

      // Enter workspace
      fireEvent.click(screen.getByText("Enter Workspace"));
      await waitFor(() => {
        expect(screen.getByTestId("workspace-card")).toBeInTheDocument();
      });

      // Simulate native browser back button (URL back to "/" and popstate event)
      act(() => {
        window.history.pushState({}, "", "/");
        window.dispatchEvent(new PopStateEvent("popstate"));
      });

      await waitFor(() => {
        expect(
          screen.getByText("Document Intake Assistant"),
        ).toBeInTheDocument();
      });
    });

    it("returns to Landing Page when pressing the Escape key", async () => {
      vi.mocked(sessionApi.createSession).mockResolvedValue(
        createInitialSession(),
      );

      render(<App />);

      // Enter workspace
      fireEvent.click(screen.getByText("Enter Workspace"));
      await waitFor(() => {
        expect(screen.getByTestId("workspace-card")).toBeInTheDocument();
      });

      // Press Escape
      fireEvent.keyDown(window, { key: "Escape" });

      await waitFor(() => {
        expect(
          screen.getByText("Document Intake Assistant"),
        ).toBeInTheDocument();
      });
    });
  });
});
