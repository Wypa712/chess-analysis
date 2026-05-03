import { GameView } from "./GameView";

const MOCK_GAME = {
  id: "preview",
  pgn: "",
  result: "win" as const,
  color: "white" as const,
  opponent: "Супротивник",
  opponentRating: 1150,
  playerRating: 1080,
  openingName: "Іспанська партія",
  timeControl: "10+0",
  playedAt: new Date("2026-05-01").toISOString(),
  moveCount: 38,
};

export default async function GamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: _id } = await params;
  return <GameView game={MOCK_GAME} />;
}
