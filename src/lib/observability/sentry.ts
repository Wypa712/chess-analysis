import * as Sentry from "@sentry/nextjs";

type SafeTags = Record<string, string | number | boolean | undefined>;

function readErrorField(error: unknown, field: "name" | "stack" | "code" | "status" | "statusCode") {
  if (error === null || typeof error !== "object" || !(field in error)) {
    return undefined;
  }
  const value = (error as Record<string, unknown>)[field];
  return typeof value === "string" || typeof value === "number" ? value : undefined;
}

export function captureSanitizedException(
  error: unknown,
  message: string,
  tags: SafeTags
) {
  const name = readErrorField(error, "name") ?? "UnknownError";
  const safeError = new Error(message);
  safeError.name = String(name);

  const stack = readErrorField(error, "stack");
  if (typeof stack === "string") {
    safeError.stack = stack;
  }

  const code = readErrorField(error, "code");
  const status = readErrorField(error, "status") ?? readErrorField(error, "statusCode");
  Sentry.captureException(safeError, {
    tags: {
      ...tags,
      error_name: String(name),
      ...(code !== undefined ? { error_code: String(code) } : {}),
      ...(status !== undefined ? { error_status: String(status) } : {}),
    },
    fingerprint: [
      String(tags.route ?? "unknown-route"),
      String(tags.code ?? code ?? status ?? name),
    ],
  });
}
