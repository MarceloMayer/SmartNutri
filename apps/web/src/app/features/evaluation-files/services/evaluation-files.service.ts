import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';

import { ApiClientService } from '../../../core/api/api-client.service';
import type { EvaluationFile, FileCategory, FileType } from '../../../core/models/evaluation-file.models';

@Injectable({
  providedIn: 'root'
})
export class EvaluationFilesService {
  private readonly api = inject(ApiClientService);

  listFiles(evaluationId: number): Observable<EvaluationFile[]> {
    return this.api.get<EvaluationFile[]>(`/physical-evaluations/${evaluationId}/files`);
  }

  uploadFile(
    evaluationId: number,
    file: File,
    type: FileType,
    category: FileCategory
  ): Observable<EvaluationFile> {
    const formData = new FormData();
    formData.append('file', file);

    return this.api.postFormData<EvaluationFile>(
      `/physical-evaluations/${evaluationId}/files`,
      formData,
      { type, category }
    );
  }

  getFileContent(fileId: number): Observable<Blob> {
    return this.api.getBlob(`/evaluation-files/${fileId}/content`);
  }

  deleteFile(fileId: number): Observable<void> {
    return this.api.delete<void>(`/evaluation-files/${fileId}`);
  }
}
