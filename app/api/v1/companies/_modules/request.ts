import type { CompanyStatus } from "@/lib/generated/prisma/client";

export type CompanyUpsertRequest = {
  name: string;
  email: string | null;
  phone: string | null;
  logo: string | null;
  address: string | null;
  timezone: string;
  currency: string;
  taxNumber: string | null;
  status: CompanyStatus;
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

const allowedCompanyStatuses = new Set<CompanyStatus>(["ACTIVE", "INACTIVE"]);
const maxLogoLength = 7 * 1024 * 1024;

export async function readJsonBody(request: Request) {
  return request.json().catch(() => null);
}

export function parseCompanyRequest(
  body: unknown,
): RequestParseResult<CompanyUpsertRequest> {
  if (!body || typeof body !== "object") {
    return {
      ok: false,
      error: "Invalid request body.",
    };
  }

  const name = normalizeRequiredString(getStringProperty(body, "name"));
  const email = normalizeOptionalString(getNullableStringProperty(body, "email"));
  const phone = normalizeOptionalString(getNullableStringProperty(body, "phone"));
  const logo = normalizeOptionalString(getNullableStringProperty(body, "logo"));
  const address = normalizeOptionalString(
    getNullableStringProperty(body, "address"),
  );
  const timezone =
    normalizeOptionalString(getNullableStringProperty(body, "timezone")) ??
    "Asia/Jakarta";
  const currency =
    normalizeOptionalString(getNullableStringProperty(body, "currency")) ??
    "IDR";
  const taxNumber = normalizeOptionalString(
    getNullableStringProperty(body, "taxNumber"),
  );
  const status =
    normalizeOptionalString(getNullableStringProperty(body, "status")) ??
    "ACTIVE";
  const normalizedStatus = status.toUpperCase();
  const normalizedCurrency = currency.toUpperCase();

  if (!name) {
    return {
      ok: false,
      error: "Company name is required.",
    };
  }

  if (name.length > 150) {
    return {
      ok: false,
      error: "Company name must be 150 characters or fewer.",
    };
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return {
      ok: false,
      error: "Company email is invalid.",
    };
  }

  if (phone && !/^[+0-9\s().-]{6,30}$/.test(phone)) {
    return {
      ok: false,
      error: "Company phone number is invalid.",
    };
  }

  if (logo && !isValidLogoValue(logo)) {
    return {
      ok: false,
      error: "Company logo must be an image URL or JPG, PNG, or WEBP data URL.",
    };
  }

  if (address && address.length > 1000) {
    return {
      ok: false,
      error: "Company address must be 1000 characters or fewer.",
    };
  }

  if (!isValidTimeZone(timezone)) {
    return {
      ok: false,
      error: "Company timezone is invalid.",
    };
  }

  if (!isValidCurrency(normalizedCurrency)) {
    return {
      ok: false,
      error: "Company currency must use a valid ISO 4217 code.",
    };
  }

  if (taxNumber && taxNumber.length > 80) {
    return {
      ok: false,
      error: "Company tax number must be 80 characters or fewer.",
    };
  }

  if (!allowedCompanyStatuses.has(normalizedStatus as CompanyStatus)) {
    return {
      ok: false,
      error: "Company status is invalid.",
    };
  }

  return {
    ok: true,
    data: {
      name,
      email,
      phone,
      logo,
      address,
      timezone,
      currency: normalizedCurrency,
      taxNumber,
      status: normalizedStatus as CompanyStatus,
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

function normalizeRequiredString(value: string | null) {
  const trimmedValue = value?.trim();

  return trimmedValue ? trimmedValue : null;
}

function normalizeOptionalString(value: string | null) {
  const trimmedValue = value?.trim();

  return trimmedValue ? trimmedValue : null;
}

function isValidLogoValue(value: string) {
  if (value.length > maxLogoLength) {
    return false;
  }

  if (/^https?:\/\/\S+$/i.test(value)) {
    return true;
  }

  return /^data:image\/(jpeg|png|webp);base64,[a-z0-9+/]+=*$/i.test(value);
}

function isValidTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat("en-US", {
      timeZone: value,
    });

    return true;
  } catch {
    return false;
  }
}

function isValidCurrency(value: string) {
  if (!/^[A-Z]{3}$/.test(value)) {
    return false;
  }

  try {
    new Intl.NumberFormat("en-US", {
      currency: value,
      style: "currency",
    });

    return true;
  } catch {
    return false;
  }
}
