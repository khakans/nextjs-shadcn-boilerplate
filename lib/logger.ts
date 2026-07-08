import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  unlinkSync,
} from "node:fs";
import path from "node:path";
import { inspect } from "node:util";

type LogLevel = "debug" | "info" | "warn" | "error";
type LogContext = Record<string, unknown>;
type SerializedError = {
  name: string;
  message: string;
  stack?: string;
  cause?: SerializedError | unknown;
};

const logLevels: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const defaultLogLevel: LogLevel =
  process.env.NODE_ENV === "production" ? "info" : "debug";
const configuredLogLevel = normalizeLogLevel(process.env.LOG_LEVEL);
const activeLogLevel = configuredLogLevel ?? defaultLogLevel;
const shouldMirrorToConsole =
  process.env.LOG_TO_CONSOLE === undefined
    ? process.env.NODE_ENV !== "production"
    : process.env.LOG_TO_CONSOLE !== "false";

const logDir = path.join(process.cwd(), "logs");
const logFilePrefix = "app";
const maxLogDays = 10;

let preparedDate: string | null = null;

export const logger = {
  debug(message: string, context?: unknown) {
    writeLog("debug", message, context);
  },
  info(message: string, context?: unknown) {
    writeLog("info", message, context);
  },
  warn(message: string, context?: unknown) {
    writeLog("warn", message, context);
  },
  error(message: string, context?: unknown) {
    writeLog("error", message, context);
  },
};

function writeLog(level: LogLevel, message: string, context?: unknown) {
  if (logLevels[level] < logLevels[activeLogLevel]) {
    return;
  }

  const now = new Date();
  const currentDate = formatDate(now);
  const normalizedContext = normalizeContext(context);
  const line = formatLine(now, level, message, normalizedContext);

  try {
    prepareLogFile(currentDate);
    appendFileSync(getLogFilePath(currentDate), `${line}\n`, "utf8");
  } catch (error) {
    console.error("[logger] Failed to write log file", error);
  }

  if (shouldMirrorToConsole) {
    writeConsole(level, message, normalizedContext);
  }
}

function prepareLogFile(currentDate: string) {
  if (preparedDate === currentDate) {
    return;
  }

  if (!existsSync(logDir)) {
    mkdirSync(logDir, {
      recursive: true,
    });
  }

  try {
    cleanupOldLogFiles(currentDate);
  } catch (error) {
    console.error("[logger] Failed to cleanup old log files", error);
  }

  preparedDate = currentDate;
}

function cleanupOldLogFiles(currentDate: string) {
  const cutoffDate = addDays(parseLogDate(currentDate), -(maxLogDays - 1));
  const logFilePattern = new RegExp(`^${logFilePrefix}-(\\d{4}-\\d{2}-\\d{2})\\.log$`);

  for (const fileName of readdirSync(logDir)) {
    const match = logFilePattern.exec(fileName);

    if (!match) {
      continue;
    }

    const fileDate = parseLogDate(match[1]);

    if (fileDate < cutoffDate) {
      unlinkSync(path.join(logDir, fileName));
    }
  }
}

function normalizeContext(context: unknown): LogContext | null {
  if (context === undefined) {
    return null;
  }

  if (context instanceof Error) {
    return {
      error: serializeError(context),
    };
  }

  if (isPlainObject(context)) {
    return sanitizeValue(context, new WeakSet()) as LogContext;
  }

  return {
    data: sanitizeValue(context, new WeakSet()),
  };
}

function serializeError(
  error: Error,
  seen = new WeakSet<object>(),
): SerializedError | string {
  if (seen.has(error)) {
    return "[Circular]";
  }

  seen.add(error);

  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
    cause:
      error.cause instanceof Error
        ? serializeError(error.cause, seen)
        : sanitizeValue(error.cause, seen),
  };
}

function sanitizeValue(value: unknown, seen: WeakSet<object>): unknown {
  if (value instanceof Error) {
    return serializeError(value, seen);
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, seen));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  if (seen.has(value)) {
    return "[Circular]";
  }

  seen.add(value);

  const entries = Object.entries(value as Record<string, unknown>).map(
    ([key, entryValue]) => [
      key,
      shouldRedactKey(key) ? "[Redacted]" : sanitizeValue(entryValue, seen),
    ],
  );

  return Object.fromEntries(entries);
}

function shouldRedactKey(key: string) {
  const normalizedKey = key.toLowerCase();

  return [
    "authorization",
    "cookie",
    "csrf",
    "jwt",
    "password",
    "secret",
    "session",
    "token",
  ].some((sensitiveKey) => normalizedKey.includes(sensitiveKey));
}

function formatLine(
  date: Date,
  level: LogLevel,
  message: string,
  context: LogContext | null,
) {
  const baseLine = `[${formatTimestamp(date)}] ${level}: ${message}`;

  if (!context) {
    return baseLine;
  }

  return `${baseLine} ${JSON.stringify(context)}`;
}

function writeConsole(
  level: LogLevel,
  message: string,
  context: LogContext | null,
) {
  const consoleMethod =
    level === "debug"
      ? console.debug
      : level === "info"
        ? console.info
        : level === "warn"
          ? console.warn
          : console.error;

  if (context) {
    consoleMethod(message, inspect(context, { depth: 8, colors: false }));
    return;
  }

  consoleMethod(message);
}

function getLogFilePath(date: string) {
  return path.join(logDir, `${logFilePrefix}-${date}.log`);
}

function formatTimestamp(date: Date) {
  return `${formatDate(date)} ${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}:${pad(date.getSeconds())}`;
}

function formatDate(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}`;
}

function parseLogDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);

  return new Date(year, month - 1, day);
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);

  return result;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function normalizeLogLevel(value: string | undefined): LogLevel | null {
  if (
    value === "debug" ||
    value === "info" ||
    value === "warn" ||
    value === "error"
  ) {
    return value;
  }

  return null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    !!value &&
    typeof value === "object" &&
    (Object.getPrototypeOf(value) === Object.prototype ||
      Object.getPrototypeOf(value) === null)
  );
}
