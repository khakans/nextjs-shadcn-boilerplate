import { ApiError } from "@/lib/api-response";

export function assertAllowedUserEmailDomain(email: string) {
  const allowedDomains = getAllowedUserDomains();

  if (allowedDomains.length === 0) {
    return;
  }

  const domain = getEmailDomain(email);

  if (!domain || !allowedDomains.includes(domain)) {
    throw new ApiError("Email domain is not allowed for registration.", 403);
  }
}

function getAllowedUserDomains() {
  return (process.env.USER_DOMAIN ?? "")
    .split(",")
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean);
}

function getEmailDomain(email: string) {
  return email.split("@").pop()?.trim().toLowerCase() ?? null;
}
