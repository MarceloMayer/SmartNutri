import { PatientsRepository } from '../patients/patients.repository';
import type { PatientDiet } from '../patients/patients.types';

export class PatientPortalController {
  constructor(private readonly patientsRepository: PatientsRepository) {}

  async getDiet(patientUserId: number): Promise<PatientDiet> {
    const diet = await this.patientsRepository.findDietByPatientUserId(patientUserId);

    return diet ?? {
      patient: null,
      mealPlan: null
    };
  }
}
