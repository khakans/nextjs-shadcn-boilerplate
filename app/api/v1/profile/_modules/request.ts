export type AvatarRequest = {
  avatar: File;
};

export type PasswordRequest = {
  currentPassword: string;
  newPassword: string;
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

const maxAvatarSize = 5 * 1024 * 1024;
const allowedAvatarTypes = new Set(["image/jpeg", "image/png"]);

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

function getStringProperty(body: unknown, property: string): string | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const value = (body as Record<string, unknown>)[property];

  return typeof value === "string" ? value : null;
}
