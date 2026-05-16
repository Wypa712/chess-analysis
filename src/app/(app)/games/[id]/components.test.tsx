// @vitest-environment jsdom
// Smoke tests — verify Phase 7C components render without crashing.
import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock Next.js Link component
vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

// CSS modules return empty objects in jsdom — component classNames will be undefined,
// which is fine for smoke tests (we only check that rendering doesn't throw).
vi.mock('./GameView.module.css', () => ({ default: new Proxy({}, { get: (_t, prop) => String(prop) }) }));

import { EvalSection } from './EvalSection';
import { LlmTabsPanel } from './LlmTabsPanel';
import {
  STOCKFISH_ENGINE_NAME,
  STOCKFISH_ENGINE_VERSION,
  STOCKFISH_PROFILE_KEY,
  type EngineAnalysisJsonV1,
} from '@/lib/chess/engine-analysis';
import type { GameData } from './types';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const GAME_DATA: GameData = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  pgn: '[White "A"][Black "B"]\n\n1. e4 e5 1-0',
  result: 'win',
  color: 'white',
  opponent: 'Opponent',
  opponentRating: 1480,
  playerRating: 1500,
  openingName: "King's Pawn",
  timeControl: '300+3',
  playedAt: new Date().toISOString(),
  moveCount: 20,
};

const ENGINE_ANALYSIS: EngineAnalysisJsonV1 = {
  version: 1,
  profileKey: STOCKFISH_PROFILE_KEY,
  engine: {
    name: STOCKFISH_ENGINE_NAME,
    version: STOCKFISH_ENGINE_VERSION,
    depth: 13,
  },
  accuracy: {
    white: 85.6,
    black: 92.4,
    player: 85.6,
    opponent: 92.4,
  },
  summary: {
    bestMoveCount: 12,
    goodMoveCount: 20,
    inaccuracyCount: 2,
    mistakeCount: 1,
    blunderCount: 1,
  },
  moves: [],
  keyMoments: [],
  evalGraph: [
    { ply: 0, eval: { type: 'cp', value: 0 } },
    { ply: 1, eval: { type: 'cp', value: 20 } },
    { ply: 2, eval: { type: 'cp', value: -35 } },
  ],
};

// ── EvalSection ───────────────────────────────────────────────────────────────

describe('EvalSection', () => {
  it('renders without crashing with no analysis', () => {
    expect(() =>
      render(
        <EvalSection
          game={GAME_DATA}
          analysis={null}
          currentMove={0}
          userColor="white"
          phaseAccuracy={null}
          onSeek={() => {}}
          resultLabel="Перемога"
        />
      )
    ).not.toThrow();
  });

  it('shows opponent name in title', () => {
    render(
      <EvalSection
        game={GAME_DATA}
        analysis={null}
        currentMove={0}
        userColor="white"
        phaseAccuracy={null}
        onSeek={() => {}}
        resultLabel="Перемога"
      />
    );
    expect(screen.getByText(/Opponent/)).toBeInTheDocument();
  });

  it('shows result label', () => {
    render(
      <EvalSection
        game={GAME_DATA}
        analysis={null}
        currentMove={0}
        userColor="white"
        phaseAccuracy={null}
        onSeek={() => {}}
        resultLabel="Перемога"
      />
    );
    expect(screen.getByText('Перемога')).toBeInTheDocument();
  });

  it('shows placeholder dashes when no analysis', () => {
    render(
      <EvalSection
        game={GAME_DATA}
        analysis={null}
        currentMove={0}
        userColor="white"
        phaseAccuracy={null}
        onSeek={() => {}}
        resultLabel="Нічия"
      />
    );
    // Accuracy cells should show "–" when no analysis
    const dashes = screen.getAllByText('–');
    expect(dashes.length).toBeGreaterThan(0);
  });

  it('keeps the summary compact without back link, game metadata, or phase accuracy rows', () => {
    render(
      <EvalSection
        game={GAME_DATA}
        analysis={ENGINE_ANALYSIS}
        currentMove={0}
        userColor="white"
        phaseAccuracy={[
          { white: 91.6, black: 92.2 },
          { white: 92.9, black: 80.5 },
          { white: null, black: null },
        ]}
        onSeek={() => {}}
        resultLabel="Перемога"
      />
    );

    expect(screen.queryByText('Назад')).not.toBeInTheDocument();
    expect(screen.queryByText(/King's Pawn/)).not.toBeInTheDocument();
    expect(screen.queryByText(/300\+3/)).not.toBeInTheDocument();
    expect(screen.queryByText('Дебют')).not.toBeInTheDocument();
    expect(screen.queryByText('Мідл')).not.toBeInTheDocument();
    expect(screen.queryByText('Кінець')).not.toBeInTheDocument();
    expect(screen.getByText('Точність')).toBeInTheDocument();
    expect(screen.getByText('Суперник')).toBeInTheDocument();
  });
});

// ── LlmTabsPanel ──────────────────────────────────────────────────────────────

describe('LlmTabsPanel', () => {
  const baseProps = {
    exploreMode: false,
    exploreAnalyzing: false,
    exploreEvalResult: null,
    activeTab: 'moves' as const,
    onTabChange: () => {},
    movePairs: [{ num: 1, white: 'e4', black: 'e5' }],
    analysis: null,
    currentMove: 0,
    onSeekMainline: () => {},
    analysisState: 'idle' as const,
    llmStatus: 'idle' as const,
    llmError: null,
    llmAnalysis: null,
    llmOpenPhases: {},
    onTogglePhase: () => {},
    openingName: null,
  };

  it('renders without crashing in moves tab', () => {
    expect(() => render(<LlmTabsPanel {...baseProps} />)).not.toThrow();
  });

  it('renders tab buttons', () => {
    render(<LlmTabsPanel {...baseProps} />);
    expect(screen.getByRole('button', { name: 'Ходи' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Аналіз' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Поради' })).toBeInTheDocument();
  });

  it('renders move pairs in moves tab', () => {
    render(<LlmTabsPanel {...baseProps} />);
    expect(screen.getByText('e4')).toBeInTheDocument();
    expect(screen.getByText('e5')).toBeInTheDocument();
  });

  it('renders without crashing in analysis tab', () => {
    expect(() =>
      render(<LlmTabsPanel {...baseProps} activeTab="analysis" />)
    ).not.toThrow();
  });

  it('renders without crashing in advice tab', () => {
    expect(() =>
      render(<LlmTabsPanel {...baseProps} activeTab="advice" />)
    ).not.toThrow();
  });

  it('does not render explore candidate suggestions', () => {
    render(
      <LlmTabsPanel
        {...baseProps}
        exploreMode
        exploreEvalResult={{
          eval: { type: 'cp', value: 25 },
          candidates: [
            { uci: 'b1c3', san: 'Nc3', eval: { type: 'cp', value: 25 } },
          ],
        }}
      />
    );

    expect(screen.queryByText('Кандидати')).not.toBeInTheDocument();
    expect(screen.queryByText('Nc3')).not.toBeInTheDocument();
  });
});

// ── GameView hook order regression ───────────────────────────────────────────

describe('GameView hook order', () => {
  it('does not call React hooks after the loading early return', () => {
    const source = readFileSync(resolve(__dirname, 'GameView.tsx'), 'utf8');
    const loadingReturn = 'if (enginePending || llmPending) {';
    const loadingReturnIndex = source.indexOf(loadingReturn);

    expect(loadingReturnIndex).toBeGreaterThan(-1);
    expect(source.slice(loadingReturnIndex)).not.toMatch(/\buse(?:Memo|Effect|LayoutEffect|Callback|Ref|State)\s*\(/);
  });
});

describe('GameView mobile layout', () => {
  it('keeps the board controls section as the first mobile viewport', () => {
    const css = readFileSync(resolve(__dirname, 'GameView.module.css'), 'utf8');
    const mobileBlockStart = css.indexOf('@media (max-width: 768px)');
    const mobileCss = css.slice(mobileBlockStart);

    expect(mobileBlockStart).toBeGreaterThan(-1);
    expect(mobileCss).toMatch(/\.boardArea\s*{[^}]*min-height:\s*calc\(100svh - var\(--mobile-nav-h\)\)/s);
    expect(mobileCss).toMatch(/\.boardArea\s*{[^}]*max-height:\s*calc\(100svh - var\(--mobile-nav-h\)\)/s);
  });
});

describe('GameView desktop layout', () => {
  it('keeps desktop board controls aligned to the rendered board size', () => {
    const source = readFileSync(resolve(__dirname, 'GameView.tsx'), 'utf8');
    const css = readFileSync(resolve(__dirname, 'GameView.module.css'), 'utf8');

    expect(source).toContain('"--board-size": `${boardSize}px`');
    expect(css).toMatch(/\.playerBadge\s*{[^}]*width:\s*min\(100%, var\(--board-size\)\)/s);
    expect(css).toMatch(/\.navControls\s*{[^}]*width:\s*min\(100%, var\(--board-size\)\)/s);
    expect(css).toMatch(/\.analyzeWrap\s*{[^}]*width:\s*min\(100%, var\(--board-size\)\)/s);
  });
});

describe('EvalSection chart layout', () => {
  it('keeps chart content inside the right edge of the SVG viewBox', () => {
    const source = readFileSync(resolve(__dirname, 'EvalSection.tsx'), 'utf8');

    expect(source).toContain('const CHART_RIGHT_X = CHART_W - CHART_PADDING;');
    expect(source).toContain('const CHART_CONTENT_W = CHART_RIGHT_X - AXIS_W;');
    expect(source).not.toContain('const CHART_CONTENT_W = CHART_W - AXIS_W;');
  });
});
