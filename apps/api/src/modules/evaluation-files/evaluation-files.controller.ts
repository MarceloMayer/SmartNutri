import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';

import type { MultipartFile } from '@fastify/multipart';

import { buildRelativePath, deleteFile, saveFile } from '../../storage/local-storage';
import { EvaluationFilesRepository } from './evaluation-files.repository';
import {
  ALLOWED_ATTACHMENT_MIMES,
  ALLOWED_IMAGE_MIMES,
  VALID_CATEGORIES,
  VALID_FILE_TYPES,
  type FileCategory,
  type FileType
} from './evaluation-files.types';

export class EvaluationFilesController {
  constructor(private readonly repository: EvaluationFilesRepository) {}

  async list(nutritionistUserId: number, evaluationId: string) {
    const evalId = Number(evaluationId);
    const belongs = await this.repository.evaluationBelongsToNutritionist(
      nutritionistUserId,
      evalId
    );

    if (!belongs) {
      return { status: 'not_found' as const, message: 'Physical evaluation not found' };
    }

    const data = await this.repository.listByEvaluation(nutritionistUserId, evalId);
    return { status: 'ok' as const, data };
  }

  async upload(
    nutritionistUserId: number,
    evaluationId: string,
    rawType: string,
    rawCategory: string,
    fileData: MultipartFile
  ) {
    const evalId = Number(evaluationId);

    // Validar type e category antes de consumir o stream
    const type = rawType as FileType;
    const category = rawCategory as FileCategory;

    if (!VALID_FILE_TYPES.has(type)) {
      await fileData.toBuffer().catch(() => null); // drain stream
      return { status: 'invalid' as const, message: 'Invalid type. Use "photo" or "attachment"' };
    }

    if (!VALID_CATEGORIES.has(category)) {
      await fileData.toBuffer().catch(() => null);
      return { status: 'invalid' as const, message: 'Invalid category' };
    }

    if (type === 'photo' && category === 'document') {
      await fileData.toBuffer().catch(() => null);
      return { status: 'invalid' as const, message: 'Photos cannot have category "document"' };
    }

    const mimeType = fileData.mimetype;
    const allowedSet = type === 'photo' ? ALLOWED_IMAGE_MIMES : ALLOWED_ATTACHMENT_MIMES;

    if (!allowedSet.has(mimeType)) {
      await fileData.toBuffer().catch(() => null);
      return {
        status: 'invalid' as const,
        message: `MIME type not allowed: ${mimeType}`
      };
    }

    // Consume o buffer e valida propriedade em paralelo
    const [buffer, patientId] = await Promise.all([
      fileData.toBuffer(),
      this.repository.getPatientIdForEvaluation(nutritionistUserId, evalId)
    ]);

    if (patientId === null) {
      return { status: 'not_found' as const, message: 'Physical evaluation not found' };
    }

    // Gerar nome único do arquivo
    const ext = sanitizeExt(extname(fileData.filename ?? '').toLowerCase()) || mimeToExt(mimeType);
    const fileName = `${randomUUID()}${ext}`;
    const relativePath = buildRelativePath(evalId, fileName);

    await saveFile(relativePath, buffer);

    const finalCategory: FileCategory = type === 'attachment' ? 'document' : category;

    const file = await this.repository.create({
      physicalEvaluationId: evalId,
      patientId,
      nutritionistUserId,
      type,
      category: finalCategory,
      originalName: fileData.filename ?? fileName,
      fileName,
      mimeType,
      fileSize: buffer.length,
      filePath: relativePath
    });

    return { status: 'created' as const, data: file };
  }

  async getContent(nutritionistUserId: number, fileId: string) {
    const file = await this.repository.findById(nutritionistUserId, Number(fileId));

    if (!file) {
      return { status: 'not_found' as const, message: 'File not found' };
    }

    return { status: 'ok' as const, data: file };
  }

  async delete(nutritionistUserId: number, fileId: string) {
    const file = await this.repository.delete(nutritionistUserId, Number(fileId));

    if (!file) {
      return { status: 'not_found' as const, message: 'File not found' };
    }

    await deleteFile(file.filePath).catch(() => null);

    return { status: 'ok' as const };
  }
}

function sanitizeExt(ext: string): string {
  return /^\.[a-z0-9]+$/.test(ext) ? ext : '';
}

function mimeToExt(mime: string): string {
  const map: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'application/pdf': '.pdf',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx'
  };
  return map[mime] ?? '.bin';
}
