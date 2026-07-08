import { apiError } from "@/lib/api-response";

function handleNotFound() {
  return apiError("url not found", 404);
}

export const GET = handleNotFound;
export const POST = handleNotFound;
export const PUT = handleNotFound;
export const PATCH = handleNotFound;
export const DELETE = handleNotFound;
export const OPTIONS = handleNotFound;
