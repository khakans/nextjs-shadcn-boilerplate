export type TeamListQuery = {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
};

export type TeamAvailableUserQuery = {
  page: number;
  pageSize: number;
  search?: string;
};

export type TeamRequest = {
  name: string;
  code: string;
  description: string | null;
  status: string;
};

export type TeamMemberRequest = {
  userId: string;
  role: string;
  isPrimary: boolean;
};

export type TeamMemberUpdateRequest = {
  role: string;
  isPrimary: boolean;
};

type RequestParseResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: string;
    };

const allowedStatuses = new Set(["active", "inactive"]);
const allowedRoles = new Set(["manager", "member"]);

export async function readJsonBody(request: Request) {
  return request.json().catch(() => null);
}

export function parseTeamListQuery(request: Request): TeamListQuery {
  const url = new URL(request.url);
  const status = normalizeOptionalString(url.searchParams.get("status"));

  return {
    page: parsePage(url.searchParams.get("page")),
    pageSize: parsePageSize(
      url.searchParams.get("pageSize") ?? url.searchParams.get("limit"),
    ),
    search:
      normalizeOptionalString(url.searchParams.get("search")) ?? undefined,
    status: status && allowedStatuses.has(status) ? status : undefined,
  };
}

export function parseTeamAvailableUserQuery(
  request: Request,
): TeamAvailableUserQuery {
  const url = new URL(request.url);

  return {
    page: parsePage(url.searchParams.get("page")),
    pageSize: parsePageSize(
      url.searchParams.get("pageSize") ?? url.searchParams.get("limit"),
    ),
    search:
      normalizeOptionalString(url.searchParams.get("search")) ?? undefined,
  };
}

export function parseTeamRequest(
  body: unknown,
): RequestParseResult<TeamRequest> {
  if (!body || typeof body !== "object") {
    return {
      ok: false,
      error: "Invalid request body.",
    };
  }

  const name = normalizeRequiredString(getStringProperty(body, "name"));
  const code = normalizeRequiredString(getStringProperty(body, "code"));
  const description = normalizeOptionalText(
    getNullableStringProperty(body, "description"),
  );
  const status =
    normalizeOptionalString(getNullableStringProperty(body, "status")) ??
    "active";

  if (!name) {
    return {
      ok: false,
      error: "Team name is required.",
    };
  }

  if (name.length > 120) {
    return {
      ok: false,
      error: "Team name must be 120 characters or fewer.",
    };
  }

  if (!code) {
    return {
      ok: false,
      error: "Team code is required.",
    };
  }

  const normalizedCode = code.toUpperCase();

  if (!/^[A-Z0-9_-]{2,30}$/.test(normalizedCode)) {
    return {
      ok: false,
      error:
        "Team code must be 2-30 characters and use letters, numbers, hyphen, or underscore.",
    };
  }

  if (description && description.length > 1000) {
    return {
      ok: false,
      error: "Team description must be 1000 characters or fewer.",
    };
  }

  if (!allowedStatuses.has(status)) {
    return {
      ok: false,
      error: "Team status is invalid.",
    };
  }

  return {
    ok: true,
    data: {
      name,
      code: normalizedCode,
      description,
      status,
    },
  };
}

export function parseTeamMemberRequest(
  body: unknown,
): RequestParseResult<TeamMemberRequest> {
  if (!body || typeof body !== "object") {
    return {
      ok: false,
      error: "Invalid request body.",
    };
  }

  const userId = normalizeRequiredString(getStringProperty(body, "userId"));
  const role =
    normalizeOptionalString(getNullableStringProperty(body, "role")) ??
    "member";
  const isPrimary = getBooleanProperty(body, "isPrimary") ?? true;

  if (!userId) {
    return {
      ok: false,
      error: "User is required.",
    };
  }

  if (!allowedRoles.has(role)) {
    return {
      ok: false,
      error: "Team member role is invalid.",
    };
  }

  return {
    ok: true,
    data: {
      userId,
      role,
      isPrimary,
    },
  };
}

export function parseTeamMemberUpdateRequest(
  body: unknown,
): RequestParseResult<TeamMemberUpdateRequest> {
  const parsed = parseTeamMemberRequest(body);

  if (!parsed.ok) {
    if (parsed.error === "User is required.") {
      return parseMemberUpdateWithoutUser(body);
    }

    return parsed;
  }

  return {
    ok: true,
    data: {
      role: parsed.data.role,
      isPrimary: parsed.data.isPrimary,
    },
  };
}

function parseMemberUpdateWithoutUser(
  body: unknown,
): RequestParseResult<TeamMemberUpdateRequest> {
  if (!body || typeof body !== "object") {
    return {
      ok: false,
      error: "Invalid request body.",
    };
  }

  const role =
    normalizeOptionalString(getNullableStringProperty(body, "role")) ??
    "member";
  const isPrimary = getBooleanProperty(body, "isPrimary") ?? true;

  if (!allowedRoles.has(role)) {
    return {
      ok: false,
      error: "Team member role is invalid.",
    };
  }

  return {
    ok: true,
    data: {
      role,
      isPrimary,
    },
  };
}

function parsePage(value: string | null) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 1;
  }

  return Math.max(Math.trunc(parsed), 1);
}

function parsePageSize(value: string | null) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 20;
  }

  return Math.min(Math.max(Math.trunc(parsed), 1), 50);
}

function getStringProperty(body: unknown, property: string): string | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const value = (body as Record<string, unknown>)[property];

  return typeof value === "string" ? value : null;
}

function getNullableStringProperty(body: unknown, property: string) {
  if (!body || typeof body !== "object") {
    return null;
  }

  const value = (body as Record<string, unknown>)[property];

  if (value === null) {
    return "";
  }

  return typeof value === "string" ? value : null;
}

function getBooleanProperty(body: unknown, property: string) {
  if (!body || typeof body !== "object") {
    return null;
  }

  const value = (body as Record<string, unknown>)[property];

  return typeof value === "boolean" ? value : null;
}

function normalizeRequiredString(value: string | null) {
  const trimmedValue = value?.trim();

  return trimmedValue ? trimmedValue : null;
}

function normalizeOptionalString(value: string | null) {
  const trimmedValue = value?.trim().toLowerCase();

  return trimmedValue ? trimmedValue : null;
}

function normalizeOptionalText(value: string | null) {
  const trimmedValue = value?.trim();

  return trimmedValue ? trimmedValue : null;
}
