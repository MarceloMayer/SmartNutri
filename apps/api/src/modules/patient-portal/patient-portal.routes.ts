import type { FastifyInstance } from 'fastify';

import { authorizeRoles } from '../../auth/auth.middleware';
import { PatientsRepository } from '../patients/patients.repository';
import { PatientPortalController } from './patient-portal.controller';

export async function patientPortalRoutes(app: FastifyInstance) {
  const controller = new PatientPortalController(new PatientsRepository(app.db));

  app.get('/diet', {
    preHandler: [authorizeRoles(['patient'])]
  }, async (request) => {
    return controller.getDiet(request.auth!.userId);
  });
}
