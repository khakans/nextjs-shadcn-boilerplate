import { ApiError } from "@/lib/api-response";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

type ApiRateLimitAction =
  | "auth:login"
  | "auth:signup"
  | "auth:refresh"
  | "auth:forgot-password"
  | "auth:forgot-password-email"
  | "auth:reset-password"
  | "auth:session-mutation"
  | "profile:mutation"
  | "profile:avatar"
  | "profile:password";

type ApiRateLimitConfig = {
  limit: number;
  windowMs: number;
};

const globalApiRateLimit = {
  limit: 120,
  windowMs: 60 * 1000,
} satisfies ApiRateLimitConfig;

const mutationApiRateLimit = {
  limit: 60,
  windowMs: 60 * 1000,
} satisfies ApiRateLimitConfig;

const apiRateLimitConfig = {
  "auth:login": {
    limit: 10,
    windowMs: 60 * 1000,
  },
  "auth:signup": {
    limit: 5,
    windowMs: 60 * 1000,
  },
  "auth:refresh": {
    limit: 10,
    windowMs: 60 * 1000,
  },
  "auth:forgot-password": {
    limit: 5,
    windowMs: 15 * 60 * 1000,
  },
  "auth:forgot-password-email": {
    limit: 3,
    windowMs: 15 * 60 * 1000,
  },
  "auth:reset-password": {
    limit: 10,
    windowMs: 15 * 60 * 1000,
  },
  "auth:session-mutation": {
    limit: 30,
    windowMs: 60 * 1000,
  },
  "profile:mutation": {
    limit: 30,
    windowMs: 60 * 1000,
  },
  "profile:avatar": {
    limit: 10,
    windowMs: 10 * 60 * 1000,
  },
  "profile:password": {
    limit: 10,
    windowMs: 10 * 60 * 1000,
  },
} satisfies Record<ApiRateLimitAction, ApiRateLimitConfig>;

const buckets = new Map<string, RateLimitEntry>();

export function assertRateLimit({ key, limit, windowMs }: RateLimitOptions) {
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry || entry.resetAt <= now) {
    buckets.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return;
  }

  if (entry.count >= limit) {
    throw new ApiError("Too many requests. Please try again later.", 429);
  }

  entry.count += 1;
}

export function assertGlobalApiRateLimit(request: Request) {
  assertRateLimit({
    key: `api:global:${getClientIp(request)}`,
    ...globalApiRateLimit,
  });

  if (!isSafeMethod(request.method)) {
    assertRateLimit({
      key: `api:mutation:${getClientIp(request)}`,
      ...mutationApiRateLimit,
    });
  }
}

export function assertApiRateLimit(
  request: Request,
  action: Exclude<ApiRateLimitAction, "auth:forgot-password-email">,
) {
  assertActionRateLimit(
    `api:${action}:${getClientIp(request)}`,
    apiRateLimitConfig[action],
  );
}

export function assertEmailApiRateLimit(email: string) {
  assertActionRateLimit(
    `api:auth:forgot-password-email:${email}`,
    apiRateLimitConfig["auth:forgot-password-email"],
  );
}

export function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

function assertActionRateLimit(key: string, config: ApiRateLimitConfig) {
  assertRateLimit({
    key,
    ...config,
  });
}

function isSafeMethod(method: string) {
  return method === "GET" || method === "HEAD" || method === "OPTIONS";
}
