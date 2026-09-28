export type FileType = 'photo' | 'attachment';
export type FileCategory = 'front' | 'side' | 'back' | 'other' | 'document';

export interface EvaluationFile {
  id: number;
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
  createdAt: string;
  updatedAt: string;
}

export interface EvaluationFileParams {
  id: string;         // physical_evaluation_id
}

export interface EvaluationFileIdParams {
  fileId: string;
}

export interface UploadQuerystring {
  type: string;
  category: string;
}

// ─── Allowed MIME types ───────────────────────────────────────────────────────

export const ALLOWED_IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif'
]);

export const ALLOWED_DOCUMENT_MIMES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]);

export const ALLOWED_ATTACHMENT_MIMES = new Set([
  ...ALLOWED_IMAGE_MIMES,
  ...ALLOWED_DOCUMENT_MIMES
]);

export const VALID_FILE_TYPES = new Set<FileType>(['photo', 'attachment']);
export const VALID_CATEGORIES = new Set<FileCategory>(['front', 'side', 'back', 'other', 'document']);
