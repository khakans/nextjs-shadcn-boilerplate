import { apiPath } from "@/lib/api-paths";

type ApiResponseEnvelope<T> =
  | {
      status: "success";
      message: string;
      data: T;
    }
  | {
      status: "error";
      message: string;
      data: null;
    };

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly payload: unknown,
  ) {
    super(message);
  }
}

export async function apiRequest<T>(
  path: `/${string}`,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(apiPath(path), init);
  const payload = await readJson(response);

  if (!response.ok) {
    throw new ApiClientError(getErrorMessage(payload), response.status, payload);
  }

  return unwrapApiResponse<T>(payload);
}

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiClientError && error.message) {
    return error.message;
  }

  return fallback;
}

async function readJson(response: Response) {
  return response.json().catch(() => null);
}

function getErrorMessage(payload: unknown) {
  if (
    payload &&
    typeof payload === "object" &&
    "message" in payload &&
    typeof payload.message === "string"
  ) {
    return payload.message;
  }

  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof payload.error === "string"
  ) {
    return payload.error;
  }

  return "Request failed.";
}

function unwrapApiResponse<T>(payload: unknown) {
  if (
    payload &&
    typeof payload === "object" &&
    "status" in payload &&
    "data" in payload
  ) {
    const response = payload as ApiResponseEnvelope<T>;

    if (response.status === "success") {
      return response.data;
    }
  }

  return payload as T;
}
