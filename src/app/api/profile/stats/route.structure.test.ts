import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./route.ts", import.meta.url), "utf8");

describe("GET /api/profile/stats query shape", () => {
  it("runs the five stat queries inside one Promise.all block", () => {
    expect(source).toContain("Promise.all([");
    expect(source).toMatch(
      /const \[wdlRows, colorRows, tcRows, openingRows, eloRows\]\s*=\s*await Promise\.all\(\[[\s\S]*\]/
    );

    const afterGuard = source.slice(source.indexOf("const totalGames = totalAvailable;"));
    const beforeReturn = afterGuard.slice(0, afterGuard.indexOf("return NextResponse.json"));

    expect((beforeReturn.match(/await db\s*\n\s*\.select/g) ?? []).length).toBe(0);
  });
});
