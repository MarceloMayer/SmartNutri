import type { FastifyInstance } from 'fastify';

import { authenticate, authorizeRoles } from '../auth/auth.middleware';
import { authRoutes } from './auth/auth.routes';
import { foodAliasesRoutes } from './food-aliases/food-aliases.routes';
import { foodsRoutes } from './foods/foods.routes';
import { mealFeedRoutes } from './meal-feed/meal-feed.routes';
import { nutritionistPreferencesRoutes } from './nutritionist-preferences/nutritionist-preferences.routes';
import { patientPortalRoutes } from './patient-portal/patient-portal.routes';
import { evaluationFilesRoutes } from './evaluation-files/evaluation-files.routes';
import { physicalEvaluationsRoutes } from './physical-evaluations/physical-evaluations.routes';
import { patientsRoutes } from './patients/patients.routes';
import { substitutionGroupsRoutes } from './substitution-groups/substitution-groups.routes';
import { substitutionsRoutes } from './substitutions/substitutions.routes';
import { usersRoutes } from './users/users.routes';

export async function registerModules(app: FastifyInstance) {
  await app.register(authRoutes, { prefix: '/auth' });

  app.addHook('preHandler', authenticate);

  await app.register(foodsRoutes, { prefix: '/foods' });
  await app.register(foodAliasesRoutes, { prefix: '/food-aliases' });
  await app.register(substitutionsRoutes, { prefix: '/substitutions' });
  await app.register(patientPortalRoutes, { prefix: '/patient' });
  await app.register(mealFeedRoutes, { prefix: '/meal-feed' });

  await app.register(async (staffApp) => {
    staffApp.addHook('preHandler', authorizeRoles(['admin', 'nutritionist']));

    await staffApp.register(nutritionistPreferencesRoutes);
    await staffApp.register(substitutionGroupsRoutes, { prefix: '/substitution-groups' });
    await staffApp.register(patientsRoutes);
    await staffApp.register(physicalEvaluationsRoutes);
    await staffApp.register(evaluationFilesRoutes);
    await staffApp.register(usersRoutes);
  });
}
