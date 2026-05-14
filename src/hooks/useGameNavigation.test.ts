// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useGameNavigation } from "./useGameNavigation";

describe("useGameNavigation", () => {
  it("clamps navigation between the start position and the final move", () => {
    const { result } = renderHook(() => useGameNavigation({ totalMoves: 3 }));

    expect(result.current.currentMove).toBe(-1);

    act(() => result.current.goPrev());
    expect(result.current.currentMove).toBe(-1);

    act(() => result.current.goLast());
    expect(result.current.currentMove).toBe(2);

    act(() => result.current.goNext());
    expect(result.current.currentMove).toBe(2);

    act(() => result.current.goToMove(99));
    expect(result.current.currentMove).toBe(2);

    act(() => result.current.goToMove(-99));
    expect(result.current.currentMove).toBe(-1);
  });
});
