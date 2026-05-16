// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RouteLoader } from "./RouteLoader";

describe("RouteLoader", () => {
  it("does not show copy on full-page route loaders", () => {
    render(<RouteLoader text="Завантажуємо партію..." />);

    expect(screen.queryByText("Завантажуємо партію...")).not.toBeInTheDocument();
  });

  it("keeps copy for inline loading states", () => {
    render(<RouteLoader inline text="Завантажуємо партії..." />);

    expect(screen.getByText("Завантажуємо партії...")).toBeInTheDocument();
  });
});
