import { Chess } from "chess.js";

export type ChessPosition = {
  fenBefore: string;
  fen: string;
  san: string;
  moveNumber: number;
  color: "w" | "b";
  from: string;
  to: string;
  uci: string;
};

export type ParsedGame = {
  positions: ChessPosition[];
  startFen: string;
};

export function parsePgn(pgn: string): ParsedGame | null {
  try {
    const chess = new Chess();
    chess.loadPgn(pgn);

    const history = chess.history({ verbose: true });
    const headerFen = chess.header()["FEN"];

    chess.reset();
    if (headerFen) chess.load(headerFen);

    const startFen = chess.fen();
    const positions: ChessPosition[] = [];

    for (let i = 0; i < history.length; i++) {
      const move = history[i];
      const fenBefore = chess.fen();
      chess.move(move.san);
      positions.push({
        fenBefore,
        fen: chess.fen(),
        san: move.san,
        moveNumber: Math.floor(i / 2) + 1,
        color: move.color,
        from: move.from,
        to: move.to,
        uci: `${move.from}${move.to}${move.promotion ?? ""}`,
      });
    }

    return { positions, startFen };
  } catch {
    return null;
  }
}
