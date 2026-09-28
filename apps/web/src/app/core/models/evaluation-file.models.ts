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

export const PHOTO_CATEGORIES: { value: FileCategory; label: string }[] = [
  { value: 'front', label: 'Frente' },
  { value: 'side', label: 'Lateral' },
  { value: 'back', label: 'Costas' },
  { value: 'other', label: 'Outro ângulo' }
];
