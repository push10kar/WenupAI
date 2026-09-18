import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import App from "../src/App";
import { sessionApi, ApiClientError } from "../src/api";
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
  };
});

describe("Phase 12: React UI Frontend", () => {
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
  });

  describe("Initial Rendering & Lifecycle", () => {
    it("renders header, brand title, and loading state while initializing", async () => {
      vi.mocked(sessionApi.createSession).mockReturnValue(
        new Promise(() => {}),
      );

      render(<App />);

      expect(screen.getByText("Personal Wishes Intake")).toBeInTheDocument();
      expect(
        screen.getByText(/Initializing interview session/i),
      ).toBeInTheDocument();
    });

    it("renders initial question and composer when session is created", async () => {
      vi.mocked(sessionApi.createSession).mockResolvedValue(
        createInitialSession(),
      );

      render(<App />);

      await waitFor(() => {
        expect(
          screen.getByText(/what is your full legal name/i),
        ).toBeInTheDocument();
      });

      expect(
        screen.getByPlaceholderText(/Type your response here/i),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Send response/i }),
      ).toBeInTheDocument();
    });

    it("renders structured state and document preview tabs", async () => {
      vi.mocked(sessionApi.createSession).mockResolvedValue(
        createInitialSession(),
      );

      render(<App />);

      await waitFor(() => {
        expect(
          screen.getByRole("tab", { name: /Document Preview/i }),
        ).toBeInTheDocument();
      });

      expect(
        screen.getByRole("tab", { name: /Structured State/i }),
      ).toBeInTheDocument();

      // Switch to Structured State tab
      fireEvent.click(screen.getByRole("tab", { name: /Structured State/i }));
      expect(screen.getByText("Personal Details")).toBeInTheDocument();
      expect(screen.getByText("Full Name")).toBeInTheDocument();
      expect(screen.getAllByText("Not provided").length).toBeGreaterThan(0);
    });
  });

  describe("User Interaction & Turn Submission", () => {
    it("allows user to enter answer and submit turn to API", async () => {
      const initialSession = createInitialSession();
      vi.mocked(sessionApi.createSession).mockResolvedValue(initialSession);

      const updatedSession: Session = {
        ...initialSession,
        version: 2,
        messages: [
          ...initialSession.messages,
          {
            id: "msg-2",
            role: "user",
            content: "My name is Arthur Dent",
            createdAt: "2026-09-19T00:01:00.000Z",
          },
          {
            id: "msg-3",
            role: "assistant",
            content: "Nice to meet you Arthur. Where do you live?",
            createdAt: "2026-09-19T00:01:01.000Z",
          },
        ],
        state: {
          ...initialSession.state,
          fullName: { value: "Arthur Dent", status: "CONFIRMED" },
        },
      };

      vi.mocked(sessionApi.sendMessage).mockResolvedValue({
        session: updatedSession,
        assistantMessage: updatedSession.messages[2],
      });

      render(<App />);

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText(/Type your response here/i),
        ).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/Type your response here/i);
      fireEvent.change(input, { target: { value: "My name is Arthur Dent" } });
      expect(input).toHaveValue("My name is Arthur Dent");

      const submitBtn = screen.getByRole("button", { name: /Send response/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(sessionApi.sendMessage).toHaveBeenCalledWith(
          "session-1",
          "My name is Arthur Dent",
        );
      });

      // Updated question and messages render
      await waitFor(() => {
        expect(
          screen.getByText("Nice to meet you Arthur. Where do you live?"),
        ).toBeInTheDocument();
      });

      // Input is cleared upon successful submission
      expect(input).toHaveValue("");
    });

    it("prevents empty submission and duplicate submission while loading", async () => {
      vi.mocked(sessionApi.createSession).mockResolvedValue(
        createInitialSession(),
      );

      render(<App />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Send response/i }),
        ).toBeDisabled();
      });

      // Attempting to submit empty input does not call API
      const input = screen.getByPlaceholderText(/Type your response here/i);
      fireEvent.change(input, { target: { value: "   " } });
      expect(
        screen.getByRole("button", { name: /Send response/i }),
      ).toBeDisabled();

      fireEvent.submit(input);
      expect(sessionApi.sendMessage).not.toHaveBeenCalled();
    });
  });

  describe("Error Handling", () => {
    it("surfaces API validation error and preserves user input", async () => {
      vi.mocked(sessionApi.createSession).mockResolvedValue(
        createInitialSession(),
      );
      vi.mocked(sessionApi.sendMessage).mockRejectedValue(
        new ApiClientError(
          "VALIDATION_ERROR",
          "Semantic validation failed for candidate",
        ),
      );

      render(<App />);

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText(/Type your response here/i),
        ).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/Type your response here/i);
      fireEvent.change(input, { target: { value: "Bad Input" } });
      fireEvent.click(screen.getByRole("button", { name: /Send response/i }));

      await waitFor(() => {
        expect(
          screen.getByText("Semantic validation failed for candidate"),
        ).toBeInTheDocument();
      });

      // User input is preserved on failure
      expect(input).toHaveValue("Bad Input");
    });

    it("surfaces conflict response with corrective guidance without resolving client-side", async () => {
      vi.mocked(sessionApi.createSession).mockResolvedValue(
        createInitialSession(),
      );
      vi.mocked(sessionApi.sendMessage).mockRejectedValue(
        new ApiClientError(
          "CONFLICT",
          "The candidate update conflicts with confirmed wishes.",
        ),
      );

      render(<App />);

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText(/Type your response here/i),
        ).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/Type your response here/i);
      fireEvent.change(input, { target: { value: "Conflicting turn" } });
      fireEvent.click(screen.getByRole("button", { name: /Send response/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/Clarification \/ Conflict Detected/i),
        ).toBeInTheDocument();
      });

      expect(
        screen.getByText(
          /The candidate update conflicts with confirmed wishes/i,
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /If you intend to update or correct previous information/i,
        ),
      ).toBeInTheDocument();
    });

    it("surfaces network error cleanly", async () => {
      vi.mocked(sessionApi.createSession).mockResolvedValue(
        createInitialSession(),
      );
      vi.mocked(sessionApi.sendMessage).mockRejectedValue(
        new ApiClientError("NETWORK_ERROR", "Unable to connect to server"),
      );

      render(<App />);

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText(/Type your response here/i),
        ).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/Type your response here/i);
      fireEvent.change(input, { target: { value: "Hello" } });
      fireEvent.click(screen.getByRole("button", { name: /Send response/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/Unable to connect to server/i),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Completion State", () => {
    it("renders completion view and disables composer when interview is complete", async () => {
      const initialSession = createInitialSession();
      vi.mocked(sessionApi.createSession).mockResolvedValue(initialSession);

      const completedSession: Session = {
        ...initialSession,
        version: 9,
        messages: [
          ...initialSession.messages,
          {
            id: "msg-complete",
            role: "assistant",
            content:
              "All required information has been collected. Your draft personal wishes document is ready.",
            createdAt: "2026-09-19T00:05:00.000Z",
          },
        ],
        state: {
          fullName: { value: "Arthur Dent", status: "CONFIRMED" },
          homeAddress: { value: "Cottington, UK", status: "CONFIRMED" },
          coversWorldwideAssets: { value: true, status: "CONFIRMED" },
          hasChildren: { value: false, status: "CONFIRMED" },
          children: [],
          executor: {
            name: { value: "Ford Prefect", status: "CONFIRMED" },
            relationship: { value: "Friend", status: "CONFIRMED" },
          },
          specificGifts: [],
          additionalWishes: { value: "No other wishes", status: "CONFIRMED" },
        },
        document: {
          title: "Draft Personal Wishes Document",
          subtitle: "Fictional example — Not legal advice",
          status: "draft",
          sections: [
            {
              title: "1. Identification",
              content: "I, Arthur Dent, residing at Cottington, UK...",
            },
          ],
          content: "Draft content finalized",
        },
      };

      vi.mocked(sessionApi.sendMessage).mockResolvedValue({
        session: completedSession,
        assistantMessage: completedSession.messages[1],
      });

      render(<App />);

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText(/Type your response here/i),
        ).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/Type your response here/i);
      fireEvent.change(input, { target: { value: "Final answer" } });
      fireEvent.click(screen.getByRole("button", { name: /Send response/i }));

      // Completion view appears
      await waitFor(() => {
        expect(screen.getByText("Intake Complete")).toBeInTheDocument();
      });

      expect(
        screen.getByText(
          /All necessary personal wishes information has been collected/i,
        ),
      ).toBeInTheDocument();

      // Normal question composer is hidden
      expect(
        screen.queryByPlaceholderText(/Type your response here/i),
      ).not.toBeInTheDocument();

      // New session button allows restarting
      expect(
        screen.getByRole("button", { name: /Start another interview/i }),
      ).toBeInTheDocument();
    });
  });
});
