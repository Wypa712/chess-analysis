import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./route.ts", import.meta.url), "utf8");

describe("POST /api/analysis/group cache ordering", () => {
  it("checks the group-analysis cache before building game summaries", () => {
    const firstSummaryBuild = source.indexOf("await buildGameSummaries");
    const firstCacheLookup = source.indexOf("const cachedRows = await db");

    expect(firstCacheLookup).toBeGreaterThan(-1);
    expect(firstSummaryBuild).toBeGreaterThan(-1);
    expect(firstCacheLookup).toBeLessThan(firstSummaryBuild);
  });
});
