import type { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';

import type {
  CreatePhysicalEvaluationBody,
  PhysicalEvaluation,
  UpdatePhysicalEvaluationBody
} from './physical-evaluations.types';

type TimestampValue = Date | string;

type PhysicalEvaluationRow = RowDataPacket
  & Omit<PhysicalEvaluation, 'evaluatedAt' | 'createdAt' | 'updatedAt'>
  & { evaluatedAt: string; createdAt: TimestampValue; updatedAt: TimestampValue };

const SELECT_COLUMNS = `
  id,
  nutritionist_user_id AS nutritionistUserId,
  patient_id           AS patientId,
  DATE_FORMAT(evaluated_at, '%Y-%m-%d') AS evaluatedAt,
  weight_kg            AS weightKg,
  height_cm            AS heightCm,
  bmi,
  goal,
  waist_cm             AS waistCm,
  hip_cm               AS hipCm,
  abdomen_cm           AS abdomenCm,
  chest_cm             AS chestCm,
  right_arm_cm         AS rightArmCm,
  left_arm_cm          AS leftArmCm,
  right_forearm_cm     AS rightForearmCm,
  left_forearm_cm      AS leftForearmCm,
  right_thigh_cm       AS rightThighCm,
  left_thigh_cm        AS leftThighCm,
  right_calf_cm        AS rightCalfCm,
  left_calf_cm         AS leftCalfCm,
  triceps_skinfold_mm       AS tricepsSkinfoldMm,
  biceps_skinfold_mm        AS bicepsSkinfoldMm,
  subscapular_skinfold_mm   AS subscapularSkinfoldMm,
  suprailiac_skinfold_mm    AS suprailiacSkinfoldMm,
  abdominal_skinfold_mm     AS abdominalSkinfoldMm,
  pectoral_skinfold_mm      AS pectoralSkinfoldMm,
  midaxillary_skinfold_mm   AS midaxillarySkinfoldMm,
  thigh_skinfold_mm         AS thighSkinfoldMm,
  calf_skinfold_mm          AS calfSkinfoldMm,
  notes,
  created_at AS createdAt,
  updated_at AS updatedAt
`;

export class PhysicalEvaluationsRepository {
  constructor(private readonly db: Pool) {}

  async patientBelongsToNutritionist(
    nutritionistUserId: number,
    patientId: number
  ): Promise<boolean> {
    const [rows] = await this.db.query<Array<RowDataPacket & { id: number }>>(
      `
        SELECT id
        FROM patients
        WHERE id = :patientId
          AND nutritionist_user_id = :nutritionistUserId
        LIMIT 1
      `,
      { nutritionistUserId, patientId }
    );

    return rows.length > 0;
  }

  async list(nutritionistUserId: number, patientId: number): Promise<PhysicalEvaluation[]> {
    const [rows] = await this.db.query<PhysicalEvaluationRow[]>(
      `
        SELECT ${SELECT_COLUMNS}
        FROM physical_evaluations
        WHERE patient_id = :patientId
          AND nutritionist_user_id = :nutritionistUserId
        ORDER BY evaluated_at DESC, id DESC
      `,
      { nutritionistUserId, patientId }
    );

    return rows.map(toEvaluation);
  }

  async findById(
    nutritionistUserId: number,
    evaluationId: number
  ): Promise<PhysicalEvaluation | null> {
    const [rows] = await this.db.query<PhysicalEvaluationRow[]>(
      `
        SELECT ${SELECT_COLUMNS}
        FROM physical_evaluations
        WHERE id = :evaluationId
          AND nutritionist_user_id = :nutritionistUserId
        LIMIT 1
      `,
      { nutritionistUserId, evaluationId }
    );

    return rows[0] ? toEvaluation(rows[0]) : null;
  }

  async create(
    nutritionistUserId: number,
    patientId: number,
    input: CreatePhysicalEvaluationBody & { bmi: number }
  ): Promise<PhysicalEvaluation> {
    const [result] = await this.db.query<ResultSetHeader>(
      `
        INSERT INTO physical_evaluations (
          nutritionist_user_id, patient_id,
          evaluated_at, weight_kg, height_cm, bmi, goal,
          waist_cm, hip_cm, abdomen_cm, chest_cm,
          right_arm_cm, left_arm_cm, right_forearm_cm, left_forearm_cm,
          right_thigh_cm, left_thigh_cm, right_calf_cm, left_calf_cm,
          triceps_skinfold_mm, biceps_skinfold_mm, subscapular_skinfold_mm,
          suprailiac_skinfold_mm, abdominal_skinfold_mm, pectoral_skinfold_mm,
          midaxillary_skinfold_mm, thigh_skinfold_mm, calf_skinfold_mm,
          notes
        ) VALUES (
          :nutritionistUserId, :patientId,
          :evaluatedAt, :weightKg, :heightCm, :bmi, :goal,
          :waistCm, :hipCm, :abdomenCm, :chestCm,
          :rightArmCm, :leftArmCm, :rightForearmCm, :leftForearmCm,
          :rightThighCm, :leftThighCm, :rightCalfCm, :leftCalfCm,
          :tricepsSkinfoldMm, :bicepsSkinfoldMm, :subscapularSkinfoldMm,
          :suprailiacSkinfoldMm, :abdominalSkinfoldMm, :pectoralSkinfoldMm,
          :midaxillarySkinfoldMm, :thighSkinfoldMm, :calfSkinfoldMm,
          :notes
        )
      `,
      {
        nutritionistUserId,
        patientId,
        evaluatedAt: input.evaluatedAt,
        weightKg: input.weightKg,
        heightCm: input.heightCm,
        bmi: input.bmi,
        goal: input.goal ?? null,
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
        notes: input.notes ?? null
      }
    );

    const created = await this.findById(nutritionistUserId, result.insertId);

    if (!created) {
      throw new Error('Created physical evaluation was not found');
    }

    return created;
  }

  async update(
    nutritionistUserId: number,
    evaluationId: number,
    input: UpdatePhysicalEvaluationBody & { bmi?: number }
  ): Promise<PhysicalEvaluation | null> {
    const updates: string[] = [];
    const params: Record<string, string | number | null> = {
      nutritionistUserId,
      evaluationId
    };

    const simpleFields: Array<[keyof (UpdatePhysicalEvaluationBody & { bmi?: number }), string]> = [
      ['evaluatedAt', 'evaluated_at'],
      ['weightKg', 'weight_kg'],
      ['heightCm', 'height_cm'],
      ['bmi', 'bmi'],
      ['goal', 'goal'],
      ['waistCm', 'waist_cm'],
      ['hipCm', 'hip_cm'],
      ['abdomenCm', 'abdomen_cm'],
      ['chestCm', 'chest_cm'],
      ['rightArmCm', 'right_arm_cm'],
      ['leftArmCm', 'left_arm_cm'],
      ['rightForearmCm', 'right_forearm_cm'],
      ['leftForearmCm', 'left_forearm_cm'],
      ['rightThighCm', 'right_thigh_cm'],
      ['leftThighCm', 'left_thigh_cm'],
      ['rightCalfCm', 'right_calf_cm'],
      ['leftCalfCm', 'left_calf_cm'],
      ['tricepsSkinfoldMm', 'triceps_skinfold_mm'],
      ['bicepsSkinfoldMm', 'biceps_skinfold_mm'],
      ['subscapularSkinfoldMm', 'subscapular_skinfold_mm'],
      ['suprailiacSkinfoldMm', 'suprailiac_skinfold_mm'],
      ['abdominalSkinfoldMm', 'abdominal_skinfold_mm'],
      ['pectoralSkinfoldMm', 'pectoral_skinfold_mm'],
      ['midaxillarySkinfoldMm', 'midaxillary_skinfold_mm'],
      ['thighSkinfoldMm', 'thigh_skinfold_mm'],
      ['calfSkinfoldMm', 'calf_skinfold_mm'],
      ['notes', 'notes']
    ];

    for (const [camelKey, snakeKey] of simpleFields) {
      if (input[camelKey] !== undefined) {
        updates.push(`${snakeKey} = :${camelKey}`);
        params[camelKey] = (input[camelKey] as string | number | null) ?? null;
      }
    }

    if (updates.length === 0) {
      return this.findById(nutritionistUserId, evaluationId);
    }

    await this.db.query<ResultSetHeader>(
      `
        UPDATE physical_evaluations
        SET ${updates.join(', ')}
        WHERE id = :evaluationId
          AND nutritionist_user_id = :nutritionistUserId
      `,
      params
    );

    return this.findById(nutritionistUserId, evaluationId);
  }

  async delete(nutritionistUserId: number, evaluationId: number): Promise<boolean> {
    const [result] = await this.db.query<ResultSetHeader>(
      `
        DELETE FROM physical_evaluations
        WHERE id = :evaluationId
          AND nutritionist_user_id = :nutritionistUserId
      `,
      { nutritionistUserId, evaluationId }
    );

    return result.affectedRows > 0;
  }
}

function toEvaluation(row: PhysicalEvaluationRow): PhysicalEvaluation {
  return {
    id: row.id,
    nutritionistUserId: row.nutritionistUserId,
    patientId: row.patientId,
    evaluatedAt: row.evaluatedAt,
    weightKg: Number(row.weightKg),
    heightCm: Number(row.heightCm),
    bmi: Number(row.bmi),
    goal: row.goal,
    waistCm: toNullableNumber(row.waistCm),
    hipCm: toNullableNumber(row.hipCm),
    abdomenCm: toNullableNumber(row.abdomenCm),
    chestCm: toNullableNumber(row.chestCm),
    rightArmCm: toNullableNumber(row.rightArmCm),
    leftArmCm: toNullableNumber(row.leftArmCm),
    rightForearmCm: toNullableNumber(row.rightForearmCm),
    leftForearmCm: toNullableNumber(row.leftForearmCm),
    rightThighCm: toNullableNumber(row.rightThighCm),
    leftThighCm: toNullableNumber(row.leftThighCm),
    rightCalfCm: toNullableNumber(row.rightCalfCm),
    leftCalfCm: toNullableNumber(row.leftCalfCm),
    tricepsSkinfoldMm: toNullableNumber(row.tricepsSkinfoldMm),
    bicepsSkinfoldMm: toNullableNumber(row.bicepsSkinfoldMm),
    subscapularSkinfoldMm: toNullableNumber(row.subscapularSkinfoldMm),
    suprailiacSkinfoldMm: toNullableNumber(row.suprailiacSkinfoldMm),
    abdominalSkinfoldMm: toNullableNumber(row.abdominalSkinfoldMm),
    pectoralSkinfoldMm: toNullableNumber(row.pectoralSkinfoldMm),
    midaxillarySkinfoldMm: toNullableNumber(row.midaxillarySkinfoldMm),
    thighSkinfoldMm: toNullableNumber(row.thighSkinfoldMm),
    calfSkinfoldMm: toNullableNumber(row.calfSkinfoldMm),
    notes: row.notes,
    createdAt: serializeTimestamp(row.createdAt),
    updatedAt: serializeTimestamp(row.updatedAt)
  };
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function serializeTimestamp(value: TimestampValue): string {
  return value instanceof Date ? value.toISOString() : value;
}
