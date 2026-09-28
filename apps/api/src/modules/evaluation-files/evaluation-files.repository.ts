import type { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';

import type { EvaluationFile, FileCategory, FileType } from './evaluation-files.types';

type TimestampValue = Date | string;

type EvaluationFileRow = RowDataPacket
  & Omit<EvaluationFile, 'createdAt' | 'updatedAt'>
  & { createdAt: TimestampValue; updatedAt: TimestampValue };

const SELECT_COLUMNS = `
  id,
  physical_evaluation_id AS physicalEvaluationId,
  patient_id             AS patientId,
  nutritionist_user_id   AS nutritionistUserId,
  type,
  category,
  original_name          AS originalName,
  file_name              AS fileName,
  mime_type              AS mimeType,
  file_size              AS fileSize,
  file_path              AS filePath,
  created_at             AS createdAt,
  updated_at             AS updatedAt
`;

export class EvaluationFilesRepository {
  constructor(private readonly db: Pool) {}

  async listByEvaluation(
    nutritionistUserId: number,
    evaluationId: number
  ): Promise<EvaluationFile[]> {
    const [rows] = await this.db.query<EvaluationFileRow[]>(
      `
        SELECT ${SELECT_COLUMNS}
        FROM physical_evaluation_files
        WHERE physical_evaluation_id = :evaluationId
          AND nutritionist_user_id = :nutritionistUserId
        ORDER BY type, category, id
      `,
      { evaluationId, nutritionistUserId }
    );

    return rows.map(toFile);
  }

  async findById(
    nutritionistUserId: number,
    fileId: number
  ): Promise<EvaluationFile | null> {
    const [rows] = await this.db.query<EvaluationFileRow[]>(
      `
        SELECT ${SELECT_COLUMNS}
        FROM physical_evaluation_files
        WHERE id = :fileId
          AND nutritionist_user_id = :nutritionistUserId
        LIMIT 1
      `,
      { fileId, nutritionistUserId }
    );

    return rows[0] ? toFile(rows[0]) : null;
  }

  async evaluationBelongsToNutritionist(
    nutritionistUserId: number,
    evaluationId: number
  ): Promise<boolean> {
    const [rows] = await this.db.query<Array<RowDataPacket & { id: number }>>(
      `
        SELECT id
        FROM physical_evaluations
        WHERE id = :evaluationId
          AND nutritionist_user_id = :nutritionistUserId
        LIMIT 1
      `,
      { evaluationId, nutritionistUserId }
    );

    return rows.length > 0;
  }

  async create(params: {
    physicalEvaluationId: number;
    patientId: number;
    nutritionistUserId: number;
    type: FileType;
    category: FileCategory;
    originalName: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
    filePath: string;
  }): Promise<EvaluationFile> {
    const [result] = await this.db.query<ResultSetHeader>(
      `
        INSERT INTO physical_evaluation_files (
          physical_evaluation_id, patient_id, nutritionist_user_id,
          type, category, original_name, file_name, mime_type, file_size, file_path
        ) VALUES (
          :physicalEvaluationId, :patientId, :nutritionistUserId,
          :type, :category, :originalName, :fileName, :mimeType, :fileSize, :filePath
        )
      `,
      params
    );

    const created = await this.findById(params.nutritionistUserId, result.insertId);

    if (!created) {
      throw new Error('Created evaluation file was not found');
    }

    return created;
  }

  async getPatientIdForEvaluation(
    nutritionistUserId: number,
    evaluationId: number
  ): Promise<number | null> {
    const [rows] = await this.db.query<Array<RowDataPacket & { patient_id: number }>>(
      `
        SELECT patient_id
        FROM physical_evaluations
        WHERE id = :evaluationId
          AND nutritionist_user_id = :nutritionistUserId
        LIMIT 1
      `,
      { evaluationId, nutritionistUserId }
    );

    return rows[0]?.patient_id ?? null;
  }

  async delete(nutritionistUserId: number, fileId: number): Promise<EvaluationFile | null> {
    const file = await this.findById(nutritionistUserId, fileId);
    if (!file) return null;

    await this.db.query<ResultSetHeader>(
      `
        DELETE FROM physical_evaluation_files
        WHERE id = :fileId
          AND nutritionist_user_id = :nutritionistUserId
      `,
      { fileId, nutritionistUserId }
    );

    return file;
  }
}

function toFile(row: EvaluationFileRow): EvaluationFile {
  return {
    id: row.id,
    physicalEvaluationId: row.physicalEvaluationId,
    patientId: row.patientId,
    nutritionistUserId: row.nutritionistUserId,
    type: row.type,
    category: row.category,
    originalName: row.originalName,
    fileName: row.fileName,
    mimeType: row.mimeType,
    fileSize: row.fileSize,
    filePath: row.filePath,
    createdAt: serializeTimestamp(row.createdAt),
    updatedAt: serializeTimestamp(row.updatedAt)
  };
}

function serializeTimestamp(value: TimestampValue): string {
  return value instanceof Date ? value.toISOString() : value;
}
