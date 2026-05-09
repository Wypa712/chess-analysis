import { describe, it, expect } from 'vitest';
import { isLlmGameAnalysisV1, isGroupAnalysisJsonV1 } from './types';
import type { LlmGameAnalysisV1, GroupAnalysisJsonV1 } from './types';

describe('isLlmGameAnalysisV1', () => {
  it('validates correct LlmGameAnalysisV1 object', () => {
    const valid: LlmGameAnalysisV1 = {
      version: 1,
      language: 'uk',
      generalAssessment: 'Загальна оцінка партії',
      opening: {
        summary: 'Дебют пройшов добре',
        keyMistakes: ['Помилка на 5 ході'],
      },
      middlegame: {
        summary: 'Мідлгейм був складним',
        tacticalMisses: ['Пропущена тактика на 15 ході'],
        positionalIssues: ['Слабкість на ферзевому фланзі'],
      },
      endgame: {
        reached: true,
        summary: 'Ендшпіль програно',
      },
      criticalMoments: [
        {
          moveNumber: 12,
          color: 'white',
          move: 'Nf3',
          description: 'Критичний момент',
          recommendation: 'Краще було Nc3',
        },
      ],
      recommendations: [
        {
          title: 'Вивчити тактику',
          description: 'Практикувати вилки',
          priority: 1,
        },
      ],
    };

    expect(isLlmGameAnalysisV1(valid)).toBe(true);
  });

  it('validates object without optional endgame.summary', () => {
    const valid = {
      version: 1,
      language: 'uk',
      generalAssessment: 'Оцінка',
      opening: {
        summary: 'Дебют',
        keyMistakes: [],
      },
      middlegame: {
        summary: 'Мідлгейм',
        tacticalMisses: [],
        positionalIssues: [],
      },
      endgame: {
        reached: false,
      },
      criticalMoments: [],
      recommendations: [],
    };

    expect(isLlmGameAnalysisV1(valid)).toBe(true);
  });

  it('rejects null or undefined', () => {
    expect(isLlmGameAnalysisV1(null)).toBe(false);
    expect(isLlmGameAnalysisV1(undefined)).toBe(false);
  });

  it('rejects non-object values', () => {
    expect(isLlmGameAnalysisV1('string')).toBe(false);
    expect(isLlmGameAnalysisV1(123)).toBe(false);
    expect(isLlmGameAnalysisV1([])).toBe(false);
  });

  it('rejects wrong version', () => {
    const invalid = {
      version: 2,
      language: 'uk',
      generalAssessment: 'Оцінка',
      opening: { summary: 'Дебют', keyMistakes: [] },
      middlegame: { summary: 'Мідлгейм', tacticalMisses: [], positionalIssues: [] },
      endgame: { reached: false },
      criticalMoments: [],
      recommendations: [],
    };

    expect(isLlmGameAnalysisV1(invalid)).toBe(false);
  });

  it('rejects wrong language', () => {
    const invalid = {
      version: 1,
      language: 'en',
      generalAssessment: 'Assessment',
      opening: { summary: 'Opening', keyMistakes: [] },
      middlegame: { summary: 'Middlegame', tacticalMisses: [], positionalIssues: [] },
      endgame: { reached: false },
      criticalMoments: [],
      recommendations: [],
    };

    expect(isLlmGameAnalysisV1(invalid)).toBe(false);
  });

  it('rejects missing generalAssessment', () => {
    const invalid = {
      version: 1,
      language: 'uk',
      opening: { summary: 'Дебют', keyMistakes: [] },
      middlegame: { summary: 'Мідлгейм', tacticalMisses: [], positionalIssues: [] },
      endgame: { reached: false },
      criticalMoments: [],
      recommendations: [],
    };

    expect(isLlmGameAnalysisV1(invalid)).toBe(false);
  });

  it('rejects invalid opening structure', () => {
    const invalid = {
      version: 1,
      language: 'uk',
      generalAssessment: 'Оцінка',
      opening: { summary: 'Дебют' }, // missing keyMistakes
      middlegame: { summary: 'Мідлгейм', tacticalMisses: [], positionalIssues: [] },
      endgame: { reached: false },
      criticalMoments: [],
      recommendations: [],
    };

    expect(isLlmGameAnalysisV1(invalid)).toBe(false);
  });

  it('rejects non-string items in opening.keyMistakes', () => {
    const invalid = {
      version: 1,
      language: 'uk',
      generalAssessment: 'Оцінка',
      opening: { summary: 'Дебют', keyMistakes: [123, 'valid'] },
      middlegame: { summary: 'Мідлгейм', tacticalMisses: [], positionalIssues: [] },
      endgame: { reached: false },
      criticalMoments: [],
      recommendations: [],
    };

    expect(isLlmGameAnalysisV1(invalid)).toBe(false);
  });

  it('rejects invalid middlegame structure', () => {
    const invalid = {
      version: 1,
      language: 'uk',
      generalAssessment: 'Оцінка',
      opening: { summary: 'Дебют', keyMistakes: [] },
      middlegame: { summary: 'Мідлгейм', tacticalMisses: [] }, // missing positionalIssues
      endgame: { reached: false },
      criticalMoments: [],
      recommendations: [],
    };

    expect(isLlmGameAnalysisV1(invalid)).toBe(false);
  });

  it('rejects invalid endgame structure', () => {
    const invalid = {
      version: 1,
      language: 'uk',
      generalAssessment: 'Оцінка',
      opening: { summary: 'Дебют', keyMistakes: [] },
      middlegame: { summary: 'Мідлгейм', tacticalMisses: [], positionalIssues: [] },
      endgame: { reached: 'yes' }, // should be boolean
      criticalMoments: [],
      recommendations: [],
    };

    expect(isLlmGameAnalysisV1(invalid)).toBe(false);
  });

  it('rejects invalid endgame.summary type', () => {
    const invalid = {
      version: 1,
      language: 'uk',
      generalAssessment: 'Оцінка',
      opening: { summary: 'Дебют', keyMistakes: [] },
      middlegame: { summary: 'Мідлгейм', tacticalMisses: [], positionalIssues: [] },
      endgame: { reached: true, summary: 123 }, // should be string
      criticalMoments: [],
      recommendations: [],
    };

    expect(isLlmGameAnalysisV1(invalid)).toBe(false);
  });

  it('rejects non-array criticalMoments', () => {
    const invalid = {
      version: 1,
      language: 'uk',
      generalAssessment: 'Оцінка',
      opening: { summary: 'Дебют', keyMistakes: [] },
      middlegame: { summary: 'Мідлгейм', tacticalMisses: [], positionalIssues: [] },
      endgame: { reached: false },
      criticalMoments: 'not an array',
      recommendations: [],
    };

    expect(isLlmGameAnalysisV1(invalid)).toBe(false);
  });

  it('rejects invalid criticalMoment item', () => {
    const invalid = {
      version: 1,
      language: 'uk',
      generalAssessment: 'Оцінка',
      opening: { summary: 'Дебют', keyMistakes: [] },
      middlegame: { summary: 'Мідлгейм', tacticalMisses: [], positionalIssues: [] },
      endgame: { reached: false },
      criticalMoments: [
        {
          moveNumber: 'not a number',
          color: 'white',
          description: 'Опис',
          recommendation: 'Рекомендація',
        },
      ],
      recommendations: [],
    };

    expect(isLlmGameAnalysisV1(invalid)).toBe(false);
  });

  it('rejects invalid color in criticalMoment', () => {
    const invalid = {
      version: 1,
      language: 'uk',
      generalAssessment: 'Оцінка',
      opening: { summary: 'Дебют', keyMistakes: [] },
      middlegame: { summary: 'Мідлгейм', tacticalMisses: [], positionalIssues: [] },
      endgame: { reached: false },
      criticalMoments: [
        {
          moveNumber: 10,
          color: 'red',
          description: 'Опис',
          recommendation: 'Рекомендація',
        },
      ],
      recommendations: [],
    };

    expect(isLlmGameAnalysisV1(invalid)).toBe(false);
  });

  it('rejects invalid recommendation priority', () => {
    const invalid = {
      version: 1,
      language: 'uk',
      generalAssessment: 'Оцінка',
      opening: { summary: 'Дебют', keyMistakes: [] },
      middlegame: { summary: 'Мідлгейм', tacticalMisses: [], positionalIssues: [] },
      endgame: { reached: false },
      criticalMoments: [],
      recommendations: [
        {
          title: 'Заголовок',
          description: 'Опис',
          priority: 5, // should be 1, 2, or 3
        },
      ],
    };

    expect(isLlmGameAnalysisV1(invalid)).toBe(false);
  });
});

describe('isGroupAnalysisJsonV1', () => {
  it('validates correct GroupAnalysisJsonV1 object', () => {
    const valid: GroupAnalysisJsonV1 = {
      version: 1,
      language: 'uk',
      patterns: ['Часто втрачаєте матеріал', 'Слабкий ендшпіль'],
      tacticalWeaknesses: [
        {
          theme: 'Вилки',
          evidence: 'Пропущено 3 вилки',
          advice: 'Практикувати тактику',
        },
      ],
      strategicWeaknesses: [
        {
          theme: 'Контроль центру',
          evidence: 'Часто втрачаєте центр',
          advice: 'Вивчити принципи контролю центру',
        },
      ],
      openingAssessment: [
        {
          openingName: 'Італійська партія',
          issue: 'Слабка підготовка',
          recommendation: 'Вивчити основні варіанти',
        },
      ],
      actionPlan: [
        {
          priority: 1,
          focus: 'Тактика',
          practiceSuggestion: 'Розв\'язувати 10 задач щодня',
        },
      ],
    };

    expect(isGroupAnalysisJsonV1(valid)).toBe(true);
  });

  it('validates object with empty arrays', () => {
    const valid = {
      version: 1,
      language: 'uk',
      patterns: [],
      tacticalWeaknesses: [],
      strategicWeaknesses: [],
      openingAssessment: [],
      actionPlan: [],
    };

    expect(isGroupAnalysisJsonV1(valid)).toBe(true);
  });

  it('rejects null or undefined', () => {
    expect(isGroupAnalysisJsonV1(null)).toBe(false);
    expect(isGroupAnalysisJsonV1(undefined)).toBe(false);
  });

  it('rejects non-object values', () => {
    expect(isGroupAnalysisJsonV1('string')).toBe(false);
    expect(isGroupAnalysisJsonV1(123)).toBe(false);
    expect(isGroupAnalysisJsonV1([])).toBe(false);
  });

  it('rejects wrong version', () => {
    const invalid = {
      version: 2,
      language: 'uk',
      patterns: [],
      tacticalWeaknesses: [],
      strategicWeaknesses: [],
      openingAssessment: [],
      actionPlan: [],
    };

    expect(isGroupAnalysisJsonV1(invalid)).toBe(false);
  });

  it('rejects wrong language', () => {
    const invalid = {
      version: 1,
      language: 'en',
      patterns: [],
      tacticalWeaknesses: [],
      strategicWeaknesses: [],
      openingAssessment: [],
      actionPlan: [],
    };

    expect(isGroupAnalysisJsonV1(invalid)).toBe(false);
  });

  it('rejects non-array patterns', () => {
    const invalid = {
      version: 1,
      language: 'uk',
      patterns: 'not an array',
      tacticalWeaknesses: [],
      strategicWeaknesses: [],
      openingAssessment: [],
      actionPlan: [],
    };

    expect(isGroupAnalysisJsonV1(invalid)).toBe(false);
  });

  it('rejects non-string items in patterns', () => {
    const invalid = {
      version: 1,
      language: 'uk',
      patterns: ['valid', 123, 'also valid'],
      tacticalWeaknesses: [],
      strategicWeaknesses: [],
      openingAssessment: [],
      actionPlan: [],
    };

    expect(isGroupAnalysisJsonV1(invalid)).toBe(false);
  });

  it('rejects invalid tacticalWeaknesses structure', () => {
    const invalid = {
      version: 1,
      language: 'uk',
      patterns: [],
      tacticalWeaknesses: [
        {
          theme: 'Тема',
          evidence: 'Докази',
          // missing advice
        },
      ],
      strategicWeaknesses: [],
      openingAssessment: [],
      actionPlan: [],
    };

    expect(isGroupAnalysisJsonV1(invalid)).toBe(false);
  });

  it('rejects invalid strategicWeaknesses structure', () => {
    const invalid = {
      version: 1,
      language: 'uk',
      patterns: [],
      tacticalWeaknesses: [],
      strategicWeaknesses: [
        {
          theme: 123, // should be string
          evidence: 'Докази',
          advice: 'Порада',
        },
      ],
      openingAssessment: [],
      actionPlan: [],
    };

    expect(isGroupAnalysisJsonV1(invalid)).toBe(false);
  });

  it('rejects invalid openingAssessment structure', () => {
    const invalid = {
      version: 1,
      language: 'uk',
      patterns: [],
      tacticalWeaknesses: [],
      strategicWeaknesses: [],
      openingAssessment: [
        {
          openingName: 'Дебют',
          issue: 'Проблема',
          // missing recommendation
        },
      ],
      actionPlan: [],
    };

    expect(isGroupAnalysisJsonV1(invalid)).toBe(false);
  });

  it('rejects invalid actionPlan priority', () => {
    const invalid = {
      version: 1,
      language: 'uk',
      patterns: [],
      tacticalWeaknesses: [],
      strategicWeaknesses: [],
      openingAssessment: [],
      actionPlan: [
        {
          priority: 0, // should be 1, 2, or 3
          focus: 'Фокус',
          practiceSuggestion: 'Практика',
        },
      ],
    };

    expect(isGroupAnalysisJsonV1(invalid)).toBe(false);
  });

  it('rejects missing actionPlan fields', () => {
    const invalid = {
      version: 1,
      language: 'uk',
      patterns: [],
      tacticalWeaknesses: [],
      strategicWeaknesses: [],
      openingAssessment: [],
      actionPlan: [
        {
          priority: 1,
          focus: 'Фокус',
          // missing practiceSuggestion
        },
      ],
    };

    expect(isGroupAnalysisJsonV1(invalid)).toBe(false);
  });
});
