import { useState, useMemo, useCallback } from "react";
import { Chess } from "chess.js";
import type { Square, Move } from "chess.js";

type UseClickToMoveOptions = {
  exploreMode: boolean;
  getActiveFen: () => string;
  onMove: (from: string, to: string) => boolean;
};

type UseClickToMoveResult = {
  selectedSquare: Square | null;
  highlightStyles: Record<string, React.CSSProperties>;
  handleSquareClick: (square: Square) => void;
  handlePieceDragBegin: (piece: string, square: Square) => void;
  clearSelection: () => void;
};

export function useClickToMove({
  exploreMode,
  getActiveFen,
  onMove,
}: UseClickToMoveOptions): UseClickToMoveResult {
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalMoves, setLegalMoves] = useState<Move[]>([]);

  const clearSelection = useCallback(() => {
    setSelectedSquare(null);
    setLegalMoves([]);
  }, []);

  const handleSquareClick = useCallback(
    (square: Square) => {
      // Step 1: Deselect if clicking on already selected square (D-05)
      if (selectedSquare === square) {
        setSelectedSquare(null);
        setLegalMoves([]);
        return;
      }

      // Step 2: If a piece is selected and the clicked square is a legal move target
      if (selectedSquare !== null && legalMoves.some((m) => m.to === square)) {
        onMove(selectedSquare, square);
        setSelectedSquare(null);
        setLegalMoves([]);
        return;
      }

      // Step 3: Try to select the piece on the clicked square
      const fen = getActiveFen();
      const chess = new Chess(fen === "start" ? undefined : fen);
      const piece = chess.get(square);
      const turnColor = chess.turn();

      if (piece && piece.color === turnColor) {
        const moves = chess.moves({ square, verbose: true }) as Move[];
        if (moves.length > 0) {
          // Select the piece and show legal moves
          setSelectedSquare(square);
          setLegalMoves(moves);
        } else {
          // Own piece with no legal moves (pinned) — deselect
          setSelectedSquare(null);
          setLegalMoves([]);
        }
      } else {
        // Clicked empty square or opponent piece — deselect (D-07)
        setSelectedSquare(null);
        setLegalMoves([]);
      }
    },
    [selectedSquare, legalMoves, exploreMode, getActiveFen, onMove]
  );

  const handlePieceDragBegin = useCallback(
    (_piece: string, _square: Square) => {
      // Clear selection when drag begins (D-08)
      setSelectedSquare(null);
      setLegalMoves([]);
    },
    []
  );

  const highlightStyles = useMemo<Record<string, React.CSSProperties>>(() => {
    const styles: Record<string, React.CSSProperties> = {};

    if (selectedSquare !== null) {
      // Highlight selected piece square with teal background (D-11)
      styles[selectedSquare] = {
        background: "rgba(79, 183, 162, 0.45)",
      };
    }

    for (const move of legalMoves) {
      const isCapture =
        move.flags.includes("c") || move.flags.includes("e");

      if (isCapture) {
        // Capture ring for squares with enemy pieces (D-10)
        styles[move.to] = {
          boxShadow: "inset 0 0 0 3px rgba(79, 183, 162, 0.75)",
        };
      } else {
        // Dot for empty squares (~25% width, D-09)
        styles[move.to] = {
          background:
            "radial-gradient(circle, rgba(79, 183, 162, 0.65) 18%, transparent 18%)",
        };
      }
    }

    return styles;
  }, [selectedSquare, legalMoves]);

  return {
    selectedSquare,
    highlightStyles,
    handleSquareClick,
    handlePieceDragBegin,
    clearSelection,
  };
}
