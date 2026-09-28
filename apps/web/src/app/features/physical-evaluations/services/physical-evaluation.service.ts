import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';

import { ApiClientService } from '../../../core/api/api-client.service';
import type {
  CreatePhysicalEvaluationPayload,
  EvaluationEvolution,
  PhysicalEvaluation,
  UpdatePhysicalEvaluationPayload
} from '../../../core/models/physical-evaluation.models';

@Injectable({
  providedIn: 'root'
})
export class PhysicalEvaluationService {
  private readonly api = inject(ApiClientService);

  listEvaluations(patientId: number): Observable<PhysicalEvaluation[]> {
    return this.api.get<PhysicalEvaluation[]>(`/patients/${patientId}/physical-evaluations`);
  }

  getEvolution(patientId: number): Observable<EvaluationEvolution> {
    return this.api.get<EvaluationEvolution>(`/patients/${patientId}/physical-evaluations/evolution`);
  }

  findById(evaluationId: number): Observable<PhysicalEvaluation> {
    return this.api.get<PhysicalEvaluation>(`/physical-evaluations/${evaluationId}`);
  }

  create(patientId: number, payload: CreatePhysicalEvaluationPayload): Observable<PhysicalEvaluation> {
    return this.api.post<PhysicalEvaluation, CreatePhysicalEvaluationPayload>(
      `/patients/${patientId}/physical-evaluations`,
      payload
    );
  }

  update(evaluationId: number, payload: UpdatePhysicalEvaluationPayload): Observable<PhysicalEvaluation> {
    return this.api.patch<PhysicalEvaluation, UpdatePhysicalEvaluationPayload>(
      `/physical-evaluations/${evaluationId}`,
      payload
    );
  }

  delete(evaluationId: number): Observable<void> {
    return this.api.delete<void>(`/physical-evaluations/${evaluationId}`);
  }
}
