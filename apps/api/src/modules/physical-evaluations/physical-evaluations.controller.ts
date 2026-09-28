import { PhysicalEvaluationsRepository } from './physical-evaluations.repository';
import type {
  CreatePhysicalEvaluationBody,
  EvaluationComparison,
  EvaluationEvolution,
  EvaluationFieldDiff,
  PhysicalEvaluation,
  UpdatePhysicalEvaluationBody
} from './physical-evaluations.types';

export class PhysicalEvaluationsController {
  constructor(
    private readonly repository: PhysicalEvaluationsRepository
  ) {}

  async list(nutritionistUserId: number, patientId: string) {
    const patientIdNum = Number(patientId);
    const patientExists = await this.repository.patientBelongsToNutritionist(
      nutritionistUserId,
      patientIdNum
    );

    if (!patientExists) {
      return { status: 'patient_not_found' as const, message: 'Patient not found' };
    }

    const data = await this.repository.list(nutritionistUserId, patientIdNum);

    return { status: 'ok' as const, data };
  }

  async create(
    nutritionistUserId: number,
    patientId: string,
    body: CreatePhysicalEvaluationBody
  ) {
    const patientIdNum = Number(patientId);
    const patientExists = await this.repository.patientBelongsToNutritionist(
      nutritionistUserId,
      patientIdNum
    );

    if (!patientExists) {
      return { status: 'patient_not_found' as const, message: 'Patient not found' };
    }

    const bmi = calculateBmi(body.weightKg, body.heightCm);

    const evaluation = await this.repository.create(nutritionistUserId, patientIdNum, {
      ...normalizeCreate(body),
      bmi
    });

    return { status: 'created' as const, data: evaluation };
  }

  async findById(nutritionistUserId: number, id: string) {
    const evaluation = await this.repository.findById(nutritionistUserId, Number(id));

    if (!evaluation) {
      return { status: 'not_found' as const, message: 'Physical evaluation not found' };
    }

    return { status: 'ok' as const, data: evaluation };
  }

  async update(
    nutritionistUserId: number,
    id: string,
    body: UpdatePhysicalEvaluationBody
  ) {
    const existing = await this.repository.findById(nutritionistUserId, Number(id));

    if (!existing) {
      return { status: 'not_found' as const, message: 'Physical evaluation not found' };
    }

    const normalized = normalizeUpdate(body);

    // Recalcula IMC se peso ou altura foram alterados
    const newWeight = normalized.weightKg ?? existing.weightKg;
    const newHeight = normalized.heightCm ?? existing.heightCm;
    const shouldRecalculateBmi =
      normalized.weightKg !== undefined || normalized.heightCm !== undefined;

    const evaluation = await this.repository.update(
      nutritionistUserId,
      Number(id),
      {
        ...normalized,
        ...(shouldRecalculateBmi ? { bmi: calculateBmi(newWeight, newHeight) } : {})
      }
    );

    if (!evaluation) {
      return { status: 'not_found' as const, message: 'Physical evaluation not found' };
    }

    return { status: 'ok' as const, data: evaluation };
  }

  async delete(nutritionistUserId: number, id: string) {
    return this.repository.delete(nutritionistUserId, Number(id));
  }

  async evolution(nutritionistUserId: number, patientId: string) {
    const patientIdNum = Number(patientId);
    const patientExists = await this.repository.patientBelongsToNutritionist(
      nutritionistUserId,
      patientIdNum
    );

    if (!patientExists) {
      return { status: 'patient_not_found' as const, message: 'Patient not found' };
    }

    // list() retorna DESC (mais recente primeiro)
    const listDesc = await this.repository.list(nutritionistUserId, patientIdNum);

    if (listDesc.length === 0) {
      const empty: EvaluationEvolution = {
        timeline: [],
        current: null,
        previous: null,
        first: null,
        vsPrevious: null,
        vsFirst: null
      };
      return { status: 'ok' as const, data: empty };
    }

    const current = listDesc[0];
    const previous = listDesc.length > 1 ? listDesc[1] : null;
    const first = listDesc[listDesc.length - 1];
    const timeline = [...listDesc].reverse();

    const data: EvaluationEvolution = {
      timeline,
      current,
      previous,
      first,
      vsPrevious: previous ? buildComparison(current, previous) : null,
      vsFirst: listDesc.length > 1 ? buildComparison(current, first) : null
    };

    return { status: 'ok' as const, data };
  }
}

function calculateBmi(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return roundToTwo(weightKg / (heightM * heightM));
}

function roundToTwo(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeCreate(
  input: CreatePhysicalEvaluationBody
): CreatePhysicalEvaluationBody {
  return {
    evaluatedAt: input.evaluatedAt,
    weightKg: input.weightKg,
    heightCm: input.heightCm,
    goal: normalizeOptionalText(input.goal),
    waistCm: input.waistCm ?? null,
    hipCm: input.hipCm ?? null,
    abdomenCm: input.abdomenCm ?? null,
    chestCm: input.chestCm ?? null,
    rightArmCm: input.rightArmCm ?? null,
    leftArmCm: input.leftArmCm ?? null,
    rightForearmCm: input.rightForearmCm ?? null,
    leftForearmCm: input.leftForearmCm ?? null,
    rightThighCm: input.rightThighCm ?? null,
    leftThighCm: input.leftThighCm ?? null,
    rightCalfCm: input.rightCalfCm ?? null,
    leftCalfCm: input.leftCalfCm ?? null,
    tricepsSkinfoldMm: input.tricepsSkinfoldMm ?? null,
    bicepsSkinfoldMm: input.bicepsSkinfoldMm ?? null,
    subscapularSkinfoldMm: input.subscapularSkinfoldMm ?? null,
    suprailiacSkinfoldMm: input.suprailiacSkinfoldMm ?? null,
    abdominalSkinfoldMm: input.abdominalSkinfoldMm ?? null,
    pectoralSkinfoldMm: input.pectoralSkinfoldMm ?? null,
    midaxillarySkinfoldMm: input.midaxillarySkinfoldMm ?? null,
    thighSkinfoldMm: input.thighSkinfoldMm ?? null,
    calfSkinfoldMm: input.calfSkinfoldMm ?? null,
    notes: normalizeOptionalText(input.notes)
  };
}

function normalizeUpdate(
  input: UpdatePhysicalEvaluationBody
): UpdatePhysicalEvaluationBody {
  const output: UpdatePhysicalEvaluationBody = {};

  if (input.evaluatedAt !== undefined) output.evaluatedAt = input.evaluatedAt;
  if (input.weightKg !== undefined) output.weightKg = input.weightKg;
  if (input.heightCm !== undefined) output.heightCm = input.heightCm;
  if (input.goal !== undefined) output.goal = normalizeOptionalText(input.goal);
  if (input.waistCm !== undefined) output.waistCm = input.waistCm ?? null;
  if (input.hipCm !== undefined) output.hipCm = input.hipCm ?? null;
  if (input.abdomenCm !== undefined) output.abdomenCm = input.abdomenCm ?? null;
  if (input.chestCm !== undefined) output.chestCm = input.chestCm ?? null;
  if (input.rightArmCm !== undefined) output.rightArmCm = input.rightArmCm ?? null;
  if (input.leftArmCm !== undefined) output.leftArmCm = input.leftArmCm ?? null;
  if (input.rightForearmCm !== undefined) output.rightForearmCm = input.rightForearmCm ?? null;
  if (input.leftForearmCm !== undefined) output.leftForearmCm = input.leftForearmCm ?? null;
  if (input.rightThighCm !== undefined) output.rightThighCm = input.rightThighCm ?? null;
  if (input.leftThighCm !== undefined) output.leftThighCm = input.leftThighCm ?? null;
  if (input.rightCalfCm !== undefined) output.rightCalfCm = input.rightCalfCm ?? null;
  if (input.leftCalfCm !== undefined) output.leftCalfCm = input.leftCalfCm ?? null;
  if (input.tricepsSkinfoldMm !== undefined) output.tricepsSkinfoldMm = input.tricepsSkinfoldMm ?? null;
  if (input.bicepsSkinfoldMm !== undefined) output.bicepsSkinfoldMm = input.bicepsSkinfoldMm ?? null;
  if (input.subscapularSkinfoldMm !== undefined) output.subscapularSkinfoldMm = input.subscapularSkinfoldMm ?? null;
  if (input.suprailiacSkinfoldMm !== undefined) output.suprailiacSkinfoldMm = input.suprailiacSkinfoldMm ?? null;
  if (input.abdominalSkinfoldMm !== undefined) output.abdominalSkinfoldMm = input.abdominalSkinfoldMm ?? null;
  if (input.pectoralSkinfoldMm !== undefined) output.pectoralSkinfoldMm = input.pectoralSkinfoldMm ?? null;
  if (input.midaxillarySkinfoldMm !== undefined) output.midaxillarySkinfoldMm = input.midaxillarySkinfoldMm ?? null;
  if (input.thighSkinfoldMm !== undefined) output.thighSkinfoldMm = input.thighSkinfoldMm ?? null;
  if (input.calfSkinfoldMm !== undefined) output.calfSkinfoldMm = input.calfSkinfoldMm ?? null;
  if (input.notes !== undefined) output.notes = normalizeOptionalText(input.notes);

  return output;
}

// ─── Helpers de evolução ─────────────────────────────────────────────────────

function buildComparison(
  current: PhysicalEvaluation,
  reference: PhysicalEvaluation
): EvaluationComparison {
  return {
    weightKg: fieldDiff(current.weightKg, reference.weightKg),
    bmi: fieldDiff(current.bmi, reference.bmi),
    waistCm: fieldDiff(current.waistCm, reference.waistCm),
    hipCm: fieldDiff(current.hipCm, reference.hipCm),
    abdomenCm: fieldDiff(current.abdomenCm, reference.abdomenCm),
    chestCm: fieldDiff(current.chestCm, reference.chestCm),
    rightArmCm: fieldDiff(current.rightArmCm, reference.rightArmCm),
    leftArmCm: fieldDiff(current.leftArmCm, reference.leftArmCm),
    rightThighCm: fieldDiff(current.rightThighCm, reference.rightThighCm),
    leftThighCm: fieldDiff(current.leftThighCm, reference.leftThighCm),
    rightCalfCm: fieldDiff(current.rightCalfCm, reference.rightCalfCm),
    leftCalfCm: fieldDiff(current.leftCalfCm, reference.leftCalfCm)
  };
}

function fieldDiff(
  current: number | null,
  reference: number | null
): EvaluationFieldDiff {
  if (current === null || reference === null) {
    return { current, reference, diff: null, diffPct: null };
  }

  const diff = roundToTwo(current - reference);
  const diffPct = reference !== 0
    ? roundToTwo(((current - reference) / reference) * 100)
    : null;

  return { current, reference, diff, diffPct };
}
