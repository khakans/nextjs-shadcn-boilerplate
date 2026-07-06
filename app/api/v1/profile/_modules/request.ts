export type AvatarRequest = {
  avatar: File;
};

export type PasswordRequest = {
  currentPassword: string;
  newPassword: string;
};

export type UsernameRequest = {
  username: string | null;
};

export type ProfileDetailsRequest = {
  birthDate?: Date | null;
  birthPlace?: string | null;
  gender?: string | null;
  mobileNumber?: string | null;
};

export type ProfileUpdateRequest = {
  username?: string | null;
} & ProfileDetailsRequest;

type RequestParseResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: string;
    };

const maxAvatarSize = 5 * 1024 * 1024;
const allowedAvatarTypes = new Set(["image/jpeg", "image/png"]);
const allowedGenders = new Set(["male", "female", "other", "prefer_not_to_say"]);

export async function readJsonBody(request: Request) {
  return request.json().catch(() => null);
}

export async function parseAvatarRequest(
  request: Request,
): Promise<RequestParseResult<AvatarRequest>> {
  const formData = await request.formData();
  const avatar = formData.get("avatar");

  if (!(avatar instanceof File)) {
    return {
      ok: false,
      error: "Avatar file is required.",
    };
  }

  if (!allowedAvatarTypes.has(avatar.type)) {
    return {
      ok: false,
      error: "Avatar must be a JPG or PNG image.",
    };
  }

  if (avatar.size > maxAvatarSize) {
    return {
      ok: false,
      error: "Avatar must be 5 MB or smaller.",
    };
  }

  return {
    ok: true,
    data: {
      avatar,
    },
  };
}

export function parsePasswordRequest(
  body: unknown,
): RequestParseResult<PasswordRequest> {
  const currentPassword = getStringProperty(body, "currentPassword");
  const newPassword = getStringProperty(body, "newPassword");

  if (!currentPassword || !newPassword) {
    return {
      ok: false,
      error: "Current password and new password are required.",
    };
  }

  if (newPassword.length < 8) {
    return {
      ok: false,
      error: "New password must be at least 8 characters.",
    };
  }

  return {
    ok: true,
    data: {
      currentPassword,
      newPassword,
    },
  };
}

export function parseUsernameRequest(
  body: unknown,
): RequestParseResult<UsernameRequest> {
  const username = getNullableStringProperty(body, "username");

  if (username === null) {
    return {
      ok: false,
      error: "Username is required.",
    };
  }

  const normalizedUsername = username.trim().toLowerCase();

  if (!normalizedUsername) {
    return {
      ok: true,
      data: {
        username: null,
      },
    };
  }

  if (!/^[a-z0-9_]{3,30}$/.test(normalizedUsername)) {
    return {
      ok: false,
      error:
        "Username must be 3-30 characters and use only letters, numbers, or underscores.",
    };
  }

  return {
    ok: true,
    data: {
      username: normalizedUsername,
    },
  };
}

export function parseProfileUpdateRequest(
  body: unknown,
): RequestParseResult<ProfileUpdateRequest> {
  if (!body || typeof body !== "object") {
    return {
      ok: false,
      error: "Invalid request body.",
    };
  }

  const usernameResult = parseOptionalUsernameRequest(body);

  if (!usernameResult.ok) {
    return usernameResult;
  }

  const hasBirthDate = hasProperty(body, "birthDate");
  const hasBirthPlace = hasProperty(body, "birthPlace");
  const hasGender = hasProperty(body, "gender");
  const hasMobileNumber = hasProperty(body, "mobileNumber");
  const birthDate = hasBirthDate
    ? getNullableStringProperty(body, "birthDate")
    : null;
  const birthPlace = hasBirthPlace
    ? getNullableStringProperty(body, "birthPlace")
    : null;
  const gender = hasGender ? getNullableStringProperty(body, "gender") : null;
  const mobileNumber = hasMobileNumber
    ? getNullableStringProperty(body, "mobileNumber")
    : null;
  const parsedBirthDate = hasBirthDate
    ? parseBirthDate(birthDate)
    : ({
        ok: true,
        value: undefined,
      } as const);

  if (!parsedBirthDate.ok) {
    return {
      ok: false,
      error: parsedBirthDate.error,
    };
  }

  const normalizedBirthPlace = normalizeOptionalString(birthPlace);
  const normalizedGender = normalizeOptionalString(gender);
  const normalizedMobileNumber = normalizeOptionalString(mobileNumber);

  if (normalizedGender && !allowedGenders.has(normalizedGender)) {
    return {
      ok: false,
      error: "Invalid gender.",
    };
  }

  if (
    normalizedMobileNumber &&
    !/^\+\d{6,15}$/.test(normalizedMobileNumber)
  ) {
    return {
      ok: false,
      error: "Mobile number must include a valid country code.",
    };
  }

  return {
    ok: true,
    data: {
      ...("username" in usernameResult.data
        ? {
            username: usernameResult.data.username,
          }
        : {}),
      ...(hasBirthDate
        ? {
            birthDate: parsedBirthDate.value,
          }
        : {}),
      ...(hasBirthPlace
        ? {
            birthPlace: normalizedBirthPlace,
          }
        : {}),
      ...(hasGender
        ? {
            gender: normalizedGender,
          }
        : {}),
      ...(hasMobileNumber
        ? {
            mobileNumber: normalizedMobileNumber,
          }
        : {}),
    },
  };
}

function parseOptionalUsernameRequest(
  body: unknown,
): RequestParseResult<{ username?: string | null }> {
  if (!body || typeof body !== "object" || !("username" in body)) {
    return {
      ok: true,
      data: {},
    };
  }

  return parseUsernameRequest(body);
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

function hasProperty(body: unknown, property: string) {
  return Boolean(
    body &&
      typeof body === "object" &&
      Object.prototype.hasOwnProperty.call(body, property),
  );
}

function normalizeOptionalString(value: string | null) {
  const trimmedValue = value?.trim();

  return trimmedValue ? trimmedValue : null;
}

function parseBirthDate(value: string | null):
  | {
      ok: true;
      value: Date | null;
    }
  | {
      ok: false;
      error: string;
    } {
  const normalizedValue = normalizeOptionalString(value);

  if (!normalizedValue) {
    return {
      ok: true,
      value: null,
    };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedValue)) {
    return {
      ok: false,
      error: "Birth date must use YYYY-MM-DD format.",
    };
  }

  const date = new Date(`${normalizedValue}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    return {
      ok: false,
      error: "Birth date is invalid.",
    };
  }

  return {
    ok: true,
    value: date,
  };
}
