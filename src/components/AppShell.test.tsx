import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("AppShell route transitions", () => {
  it("does not render its own route overlay loader", () => {
    const source = readFileSync(resolve(__dirname, "AppShell.tsx"), "utf8");

    expect(source).not.toContain("navOverlay");
    expect(source).not.toContain("RouteLoader");
  });
});
