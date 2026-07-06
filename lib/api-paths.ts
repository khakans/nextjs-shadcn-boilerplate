export const API_PREFIX = "/api/v1";

export function apiPath(path: `/${string}`) {
  return `${API_PREFIX}${path}`;
}
