export type LlmGameAnalysisV1 = {
  version: 1;
  language: "uk";
  generalAssessment: string;
  opening: {
    summary: string;
    keyMistakes: string[];
  };
  middlegame: {
    summary: string;
    tacticalMisses: string[];
    positionalIssues: string[];
  };
  endgame: {
    reached: boolean;
    summary?: string;
  };
  criticalMoments: Array<{
    moveNumber: number;
    color: "white" | "black";
    move?: string;
    description: string;
    recommendation: string;
  }>;
  recommendations: Array<{
    title: string;
    description: string;
    priority: 1 | 2 | 3;
  }>;
};

export type GroupAnalysisJsonV1 = {
  version: 1;
  language: "uk";
  patterns: string[];
  tacticalWeaknesses: Array<{
    theme: string;
    evidence: string;
    advice: string;
  }>;
  strategicWeaknesses: Array<{
    theme: string;
    evidence: string;
    advice: string;
  }>;
  openingAssessment: Array<{
    openingName: string;
    issue: string;
    recommendation: string;
  }>;
  actionPlan: Array<{
    priority: 1 | 2 | 3;
    focus: string;
    practiceSuggestion: string;
  }>;
};

export function isGroupAnalysisJsonV1(value: unknown): value is GroupAnalysisJsonV1 {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (v.version !== 1 || v.language !== "uk") return false;
  if (!Array.isArray(v.patterns) || !v.patterns.every((p: unknown) => typeof p === "string")) return false;

  function isWeaknessArray(arr: unknown): boolean {
    if (!Array.isArray(arr)) return false;
    return arr.every((w: unknown) => {
      if (!w || typeof w !== "object") return false;
      const x = w as Record<string, unknown>;
      return typeof x.theme === "string" && typeof x.evidence === "string" && typeof x.advice === "string";
    });
  }

  if (!isWeaknessArray(v.tacticalWeaknesses)) return false;
  if (!isWeaknessArray(v.strategicWeaknesses)) return false;

  if (!Array.isArray(v.openingAssessment) || !v.openingAssessment.every((o: unknown) => {
    if (!o || typeof o !== "object") return false;
    const x = o as Record<string, unknown>;
    return typeof x.openingName === "string" && typeof x.issue === "string" && typeof x.recommendation === "string";
  })) return false;

  if (!Array.isArray(v.actionPlan) || !v.actionPlan.every((a: unknown) => {
    if (!a || typeof a !== "object") return false;
    const x = a as Record<string, unknown>;
    return (x.priority === 1 || x.priority === 2 || x.priority === 3) &&
      typeof x.focus === "string" && typeof x.practiceSuggestion === "string";
  })) return false;

  return true;
}

export function isLlmGameAnalysisV1(value: unknown): value is LlmGameAnalysisV1 {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;

  if (v.version !== 1 || v.language !== "uk" || typeof v.generalAssessment !== "string") return false;

  const op = v.opening as Record<string, unknown> | null | undefined;
  if (!op || typeof op !== "object" || typeof op.summary !== "string" || !Array.isArray(op.keyMistakes)) return false;
  if (!op.keyMistakes.every((x: unknown) => typeof x === "string")) return false;

  const mg = v.middlegame as Record<string, unknown> | null | undefined;
  if (!mg || typeof mg !== "object" || typeof mg.summary !== "string") return false;
  if (!Array.isArray(mg.tacticalMisses) || !mg.tacticalMisses.every((x: unknown) => typeof x === "string")) return false;
  if (!Array.isArray(mg.positionalIssues) || !mg.positionalIssues.every((x: unknown) => typeof x === "string")) return false;

  const eg = v.endgame as Record<string, unknown> | null | undefined;
  if (!eg || typeof eg !== "object" || typeof eg.reached !== "boolean") return false;
  if (eg.summary !== undefined && typeof eg.summary !== "string") return false;

  if (!Array.isArray(v.criticalMoments)) return false;
  if (!v.criticalMoments.every((cm: unknown) => {
    if (!cm || typeof cm !== "object") return false;
    const c = cm as Record<string, unknown>;
    return typeof c.moveNumber === "number" && typeof c.description === "string" && typeof c.recommendation === "string" && (c.color === "white" || c.color === "black") && (c.move === undefined || typeof c.move === "string");
  })) return false;

  if (!Array.isArray(v.recommendations)) return false;
  if (!v.recommendations.every((r: unknown) => {
    if (!r || typeof r !== "object") return false;
    const rec = r as Record<string, unknown>;
    return typeof rec.title === "string" && typeof rec.description === "string" && (rec.priority === 1 || rec.priority === 2 || rec.priority === 3);
  })) return false;

  return true;
}
