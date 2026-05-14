import { describe, expect, it, vi } from "vitest";
import { LlmRateLimitError, retryWithBackoff } from "./retry";

describe("retryWithBackoff", () => {
  it("throws LlmRateLimitError immediately when a 429 has Retry-After", async () => {
    const fn = vi.fn().mockRejectedValue({
      status: 429,
      headers: { get: (name: string) => (name === "retry-after" ? "17" : null) },
    });

    try {
      await retryWithBackoff(fn, { maxRetries: 3, baseDelayMs: 1 });
      throw new Error("Expected retryWithBackoff to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(LlmRateLimitError);
      expect(error).toMatchObject({
        name: "LlmRateLimitError",
        retryAfterSeconds: 17,
      });
    }

    expect(fn).toHaveBeenCalledTimes(1);
  });
});
