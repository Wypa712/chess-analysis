import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./route.ts", import.meta.url), "utf8");

describe("POST /api/sync concurrency shape", () => {
  it("uses a local concurrency limit instead of uncapped account fan-out", () => {
    expect(source).toContain("const SYNC_CONCURRENCY = 2;");
    expect(source).toMatch(/runWithConcurrencyLimit|semaphore/);
    expect(source).not.toMatch(/Promise\.all\(\s*accounts\.map\(/);
  });
});
