export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}

export type ApiSuccessResponse<T> = {
  status: "success";
  message: string;
  data: T;
};

export type ApiErrorResponse = {
  status: "error";
  message: string;
  data: null;
};

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export function apiOk<T>(
  data: T,
  init?: ResponseInit,
  message = "OK.",
) {
  return Response.json(
    {
      status: "success",
      message,
      data,
    } satisfies ApiSuccessResponse<T>,
    init,
  );
}

export function apiCreated<T>(data: T) {
  return apiOk(data, { status: 201 }, "Created.");
}

export function apiError(message: string, status = 400) {
  return Response.json(
    {
      status: "error",
      message,
      data: null,
    } satisfies ApiErrorResponse,
    { status },
  );
}

export function handleApiError(error: unknown) {
  if (error instanceof ApiError) {
    return apiError(error.message, error.status);
  }

  throw error;
}
