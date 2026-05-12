// @vitest-environment jsdom
// Smoke tests — verify Phase 7C components render without crashing.
import React from 'react';
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
});
