import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { PhysicalEvaluationsController } from './physical-evaluations.controller';
import { PhysicalEvaluationsRepository } from './physical-evaluations.repository';
import {
  createPhysicalEvaluationBodySchema,
  idParamsSchema,
  patientEvaluationsParamsSchema,
  updatePhysicalEvaluationBodySchema
} from './physical-evaluations.schemas';
import type {
  CreatePhysicalEvaluationBody,
  IdParams,
  PatientEvaluationsParams,
  UpdatePhysicalEvaluationBody
} from './physical-evaluations.types';

export async function physicalEvaluationsRoutes(app: FastifyInstance) {
  const repository = new PhysicalEvaluationsRepository(app.db);
  const controller = new PhysicalEvaluationsController(repository);

  // Listar avaliações de um paciente
  app.get<{ Params: PatientEvaluationsParams }>(
    '/patients/:patientId/physical-evaluations',
    { schema: { params: patientEvaluationsParamsSchema } },
    async (request, reply) => {
      const result = await controller.list(
        getNutritionistUserId(request),
        request.params.patientId
      );

      if (result.status === 'patient_not_found') {
        return reply.code(404).send({ message: result.message });
      }

      return result.data;
    }
  );

  // Evolução das avaliações de um paciente
  app.get<{ Params: PatientEvaluationsParams }>(
    '/patients/:patientId/physical-evaluations/evolution',
    { schema: { params: patientEvaluationsParamsSchema } },
    async (request, reply) => {
      const result = await controller.evolution(
        getNutritionistUserId(request),
        request.params.patientId
      );

      if (result.status === 'patient_not_found') {
        return reply.code(404).send({ message: result.message });
      }

      return result.data;
    }
  );

  // Criar avaliação para um paciente
  app.post<{ Params: PatientEvaluationsParams; Body: CreatePhysicalEvaluationBody }>(
    '/patients/:patientId/physical-evaluations',
    {
      schema: {
        params: patientEvaluationsParamsSchema,
        body: createPhysicalEvaluationBodySchema
      }
    },
    async (request, reply) => {
      const result = await controller.create(
        getNutritionistUserId(request),
        request.params.patientId,
        request.body
      );

      if (result.status === 'patient_not_found') {
        return reply.code(404).send({ message: result.message });
      }

      return reply.code(201).send(result.data);
    }
  );

  // Buscar avaliação por id
  app.get<{ Params: IdParams }>(
    '/physical-evaluations/:id',
    { schema: { params: idParamsSchema } },
    async (request, reply) => {
      const result = await controller.findById(
        getNutritionistUserId(request),
        request.params.id
      );

      if (result.status === 'not_found') {
        return reply.code(404).send({ message: result.message });
      }

      return result.data;
    }
  );

  // Editar avaliação (PATCH e PUT compartilham o mesmo handler)
  async function updateHandler(
    request: FastifyRequest<{ Params: IdParams; Body: UpdatePhysicalEvaluationBody }>,
    reply: FastifyReply
  ) {
    const result = await controller.update(
      getNutritionistUserId(request),
      request.params.id,
      request.body
    );

    if (result.status === 'not_found') {
      return reply.code(404).send({ message: result.message });
    }

    return result.data;
  }

  app.patch<{ Params: IdParams; Body: UpdatePhysicalEvaluationBody }>(
    '/physical-evaluations/:id',
    {
      schema: {
        params: idParamsSchema,
        body: updatePhysicalEvaluationBodySchema
      }
    },
    updateHandler
  );

  app.put<{ Params: IdParams; Body: UpdatePhysicalEvaluationBody }>(
    '/physical-evaluations/:id',
    {
      schema: {
        params: idParamsSchema,
        body: updatePhysicalEvaluationBodySchema
      }
    },
    updateHandler
  );

  // Excluir avaliação
  app.delete<{ Params: IdParams }>(
    '/physical-evaluations/:id',
    { schema: { params: idParamsSchema } },
    async (request, reply) => {
      const deleted = await controller.delete(
        getNutritionistUserId(request),
        request.params.id
      );

      if (!deleted) {
        return reply.code(404).send({ message: 'Physical evaluation not found' });
      }

      return reply.code(204).send();
    }
  );
}

function getNutritionistUserId(request: { auth: { userId: number } | null }): number {
  return request.auth?.userId ?? 0;
}
