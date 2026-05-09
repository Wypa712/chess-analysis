type RetryOptions = {
  maxRetries?: number;
  baseDelayMs?: number;
};

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
