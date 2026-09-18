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

const getBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (typeof envUrl === "string" && envUrl.trim().length > 0) {
    return envUrl.replace(/\/+$/, "");
  }
  return "";
};

/**
 * Handles HTTP requests and normalizes API error responses.
 */
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${path}`;

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (err) {
    throw new ApiClientError(
      "NETWORK_ERROR",
      `Unable to connect to server: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    if (!response.ok) {
      throw new ApiClientError(
        "SERVER_ERROR",
        `Server returned status ${response.status}`,
      );
    }
    data = null;
  }

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
   * Initializes a new interview session.
   */
  async createSession(initialState?: unknown): Promise<Session> {
    const res = await request<CreateSessionResponse>("/api/sessions", {
      method: "POST",
      body: JSON.stringify(initialState ? { initialState } : {}),
    });
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
