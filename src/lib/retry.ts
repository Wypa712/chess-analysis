type RetryOptions = {
  maxRetries?: number;
  baseDelayMs?: number;
};

export class LlmRateLimitError extends Error {
  constructor(public readonly retryAfterSeconds: number) {
    super(`LLM rate limited — retry after ${retryAfterSeconds}s`);
    this.name = "LlmRateLimitError";
  }
}

function isRetryable(err: unknown): boolean {
  if (err instanceof TypeError) return true;
  if (err !== null && typeof err === "object" && "status" in err) {
    const s = (err as { status: number }).status;
    return s === 429 || s === 503;
  }
  return false;
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  { maxRetries = 3, baseDelayMs = 1000 }: RetryOptions = {}
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`[retry] attempt ${attempt + 1}/${maxRetries + 1}`);
      }
      return await fn();
    } catch (err) {
      lastErr = err;
      if (
        err !== null &&
        typeof err === "object" &&
        "status" in err &&
        (err as { status: number }).status === 429
      ) {
        const headers = (err as { headers?: { get?: (key: string) => string | null } })
          .headers;
        const retryAfter = headers?.get?.("retry-after");
        if (retryAfter !== null && retryAfter !== undefined) {
          throw new LlmRateLimitError(parseInt(retryAfter, 10) || 60);
        }
      }
      const isAbort =
        err instanceof Error &&
        (err.name === "AbortError" || err.message.toLowerCase().includes("abort"));
      if (isAbort || !isRetryable(err) || attempt === maxRetries) throw err;
      const delay = Math.min(baseDelayMs * 2 ** attempt, 4000);
      await new Promise((res) => setTimeout(res, delay));
    }
  }
  throw lastErr;
}
