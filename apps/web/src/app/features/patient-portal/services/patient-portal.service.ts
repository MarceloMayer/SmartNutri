import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';

import { ApiClientService } from '../../../core/api/api-client.service';
import type { PatientDiet } from '../../../core/models/patient.models';

@Injectable({
  providedIn: 'root'
})
export class PatientPortalService {
  private readonly api = inject(ApiClientService);

  findDiet(): Observable<PatientDiet> {
    return this.api.get<PatientDiet>('/patient/diet');
  }
}
