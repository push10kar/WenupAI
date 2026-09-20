import { Session, Message, ApiError } from "../types";

export class ApiClientError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
  }
}

export interface SendMessageResponse {
  readonly session: Session;
  readonly assistantMessage: Message;
}

export interface CreateSessionResponse {
  readonly session: Session;
}

export interface GetSessionResponse {
  readonly session: Session;
}

export interface GetLLMConfigResponse {
  readonly provider: "mock" | "gemini" | "openrouter";
}

const getBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (typeof envUrl === "string" && envUrl.trim().length > 0) {
    return envUrl.replace(/\/+$/, "");
  }
  return "";
};

/**
 * Hard ceiling for any single HTTP request. The backend bounds individual LLM
 * calls (default 60s, plus extraction retries) so this generous cap guarantees
 * the promise always settles — without it, a stalled network request would leave
 * the UI stuck in its loading state indefinitely.
 */
const REQUEST_TIMEOUT_MS = 120_000;

/**
 * Handles HTTP requests and normalizes API error responses.
 *
 * Every request is bounded by REQUEST_TIMEOUT_MS and can additionally be
 * cancelled via `signal`, which lets callers supersede stale requests (e.g. when
 * a new session is started while another is still in flight).
 */
async function request<T>(
  path: string,
  options: RequestInit = {},
  externalSignal?: AbortSignal,
): Promise<T> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${path}`;

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const abortFromCaller = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener("abort", abortFromCaller, {
        once: true,
      });
    }
  }

  const cleanUp = () => {
    clearTimeout(timeoutId);
    externalSignal?.removeEventListener("abort", abortFromCaller);
  };

  const abortedByCaller = () => externalSignal?.aborted === true;
  const timeoutError = () =>
    new ApiClientError(
      "REQUEST_TIMEOUT",
      "The server took too long to respond. Please try again.",
    );

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } catch (err) {
    cleanUp();
    if (abortedByCaller()) {
      throw new ApiClientError("NETWORK_ERROR", "Request was cancelled.");
    }
    if (controller.signal.aborted) {
      throw timeoutError();
    }
    throw new ApiClientError(
      "NETWORK_ERROR",
      `Unable to connect to server: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    if (abortedByCaller()) {
      cleanUp();
      throw new ApiClientError("NETWORK_ERROR", "Request was cancelled.");
    }
    if (controller.signal.aborted) {
      cleanUp();
      throw timeoutError();
    }
    if (!response.ok) {
      cleanUp();
      throw new ApiClientError(
        "SERVER_ERROR",
        `Server returned status ${response.status}`,
      );
    }
    data = null;
  }
  cleanUp();

  if (!response.ok) {
    const errorBody = data as { error?: ApiError } | null;
    if (
      errorBody &&
      errorBody.error &&
      typeof errorBody.error.code === "string"
    ) {
      throw new ApiClientError(errorBody.error.code, errorBody.error.message);
    }
    throw new ApiClientError(
      "UNKNOWN_ERROR",
      `Request failed with status ${response.status}`,
    );
  }

  return data as T;
}

export const sessionApi = {
  /**
   * Initializes a new interview session. May be cancelled via `signal` so a
   * stale creation can be superseded when a newer session is started.
   */
  async createSession(
    initialState?: unknown,
    signal?: AbortSignal,
  ): Promise<Session> {
    const res = await request<CreateSessionResponse>(
      "/api/sessions",
      {
        method: "POST",
        body: JSON.stringify(initialState ? { initialState } : {}),
      },
      signal,
    );
    return res.session;
  },

  /**
   * Retrieves an existing session snapshot.
   */
  async getSession(sessionId: string): Promise<Session> {
    const res = await request<GetSessionResponse>(
      `/api/sessions/${encodeURIComponent(sessionId)}`,
    );
    return res.session;
  },

  /**
   * Submits a user message turn.
   */
  async sendMessage(
    sessionId: string,
    content: string,
  ): Promise<SendMessageResponse> {
    return await request<SendMessageResponse>(
      `/api/sessions/${encodeURIComponent(sessionId)}/messages`,
      {
        method: "POST",
        body: JSON.stringify({ content }),
      },
    );
  },
};

export const configApi = {
  /**
   * Retrieves the configured LLM provider identifier.
   */
  async getLLMProvider(): Promise<GetLLMConfigResponse["provider"]> {
    const res = await request<GetLLMConfigResponse>("/api/config/llm");
    return res.provider;
  },
};
