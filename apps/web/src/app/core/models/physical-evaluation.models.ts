export interface PhysicalEvaluation {
  id: number;
  nutritionistUserId: number;
  patientId: number;
  evaluatedAt: string;
  weightKg: number;
  heightCm: number;
  bmi: number;
  goal: string | null;
  waistCm: number | null;
  hipCm: number | null;
  abdomenCm: number | null;
  chestCm: number | null;
  rightArmCm: number | null;
  leftArmCm: number | null;
  rightForearmCm: number | null;
  leftForearmCm: number | null;
  rightThighCm: number | null;
  leftThighCm: number | null;
  rightCalfCm: number | null;
  leftCalfCm: number | null;
  tricepsSkinfoldMm: number | null;
  bicepsSkinfoldMm: number | null;
  subscapularSkinfoldMm: number | null;
  suprailiacSkinfoldMm: number | null;
  abdominalSkinfoldMm: number | null;
  pectoralSkinfoldMm: number | null;
  midaxillarySkinfoldMm: number | null;
  thighSkinfoldMm: number | null;
  calfSkinfoldMm: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePhysicalEvaluationPayload {
  evaluatedAt: string;
  weightKg: number;
  heightCm: number;
  goal?: string | null;
  waistCm?: number | null;
  hipCm?: number | null;
  abdomenCm?: number | null;
  chestCm?: number | null;
  rightArmCm?: number | null;
  leftArmCm?: number | null;
  rightForearmCm?: number | null;
  leftForearmCm?: number | null;
  rightThighCm?: number | null;
  leftThighCm?: number | null;
  rightCalfCm?: number | null;
  leftCalfCm?: number | null;
  tricepsSkinfoldMm?: number | null;
  bicepsSkinfoldMm?: number | null;
  subscapularSkinfoldMm?: number | null;
  suprailiacSkinfoldMm?: number | null;
  abdominalSkinfoldMm?: number | null;
  pectoralSkinfoldMm?: number | null;
  midaxillarySkinfoldMm?: number | null;
  thighSkinfoldMm?: number | null;
  calfSkinfoldMm?: number | null;
  notes?: string | null;
}

export type UpdatePhysicalEvaluationPayload = Partial<CreatePhysicalEvaluationPayload>;

// ─── Evolução ────────────────────────────────────────────────────────────────

export interface EvaluationFieldDiff {
  current: number | null;
  reference: number | null;
  diff: number | null;
  diffPct: number | null;
}

export interface EvaluationComparison {
  weightKg: EvaluationFieldDiff;
  bmi: EvaluationFieldDiff;
  waistCm: EvaluationFieldDiff;
  hipCm: EvaluationFieldDiff;
  abdomenCm: EvaluationFieldDiff;
  chestCm: EvaluationFieldDiff;
  rightArmCm: EvaluationFieldDiff;
  leftArmCm: EvaluationFieldDiff;
  rightThighCm: EvaluationFieldDiff;
  leftThighCm: EvaluationFieldDiff;
  rightCalfCm: EvaluationFieldDiff;
  leftCalfCm: EvaluationFieldDiff;
}

export interface EvaluationEvolution {
  timeline: PhysicalEvaluation[];
  current: PhysicalEvaluation | null;
  previous: PhysicalEvaluation | null;
  first: PhysicalEvaluation | null;
  vsPrevious: EvaluationComparison | null;
  vsFirst: EvaluationComparison | null;
}
