import type { FastifyInstance } from 'fastify';

import { openReadStream } from '../../storage/local-storage';
import { EvaluationFilesController } from './evaluation-files.controller';
import { EvaluationFilesRepository } from './evaluation-files.repository';
import type {
  EvaluationFileIdParams,
  EvaluationFileParams,
  UploadQuerystring
} from './evaluation-files.types';

export async function evaluationFilesRoutes(app: FastifyInstance) {
  const repository = new EvaluationFilesRepository(app.db);
  const controller = new EvaluationFilesController(repository);

  // Listar arquivos de uma avaliação
  app.get<{ Params: EvaluationFileParams }>(
    '/physical-evaluations/:id/files',
    async (request, reply) => {
      const result = await controller.list(
        getNutritionistUserId(request),
        request.params.id
      );

      if (result.status === 'not_found') {
        return reply.code(404).send({ message: result.message });
      }

      return result.data;
    }
  );

  // Upload de arquivo para uma avaliação
  app.post<{ Params: EvaluationFileParams; Querystring: UploadQuerystring }>(
    '/physical-evaluations/:id/files',
    async (request, reply) => {
      const fileData = await request.file();

      if (!fileData) {
        return reply.code(400).send({ message: 'No file provided' });
      }

      const result = await controller.upload(
        getNutritionistUserId(request),
        request.params.id,
        request.query.type ?? '',
        request.query.category ?? '',
        fileData
      );

      if (result.status === 'not_found') {
        return reply.code(404).send({ message: result.message });
      }

      if (result.status === 'invalid') {
        return reply.code(422).send({ message: result.message });
      }

      return reply.code(201).send(result.data);
    }
  );

  // Servir conteúdo de um arquivo (stream)
  app.get<{ Params: EvaluationFileIdParams }>(
    '/evaluation-files/:fileId/content',
    async (request, reply) => {
      const result = await controller.getContent(
        getNutritionistUserId(request),
        request.params.fileId
      );

      if (result.status === 'not_found') {
        return reply.code(404).send({ message: result.message });
      }

      const file = result.data;
      const stream = openReadStream(file.filePath);

      return reply
        .header('Content-Type', file.mimeType)
        .header('Content-Disposition', `inline; filename="${file.originalName}"`)
        .send(stream);
    }
  );

  // Excluir arquivo
  app.delete<{ Params: EvaluationFileIdParams }>(
    '/evaluation-files/:fileId',
    async (request, reply) => {
      const result = await controller.delete(
        getNutritionistUserId(request),
        request.params.fileId
      );

      if (result.status === 'not_found') {
        return reply.code(404).send({ message: result.message });
      }

      return reply.code(204).send();
    }
  );
}

function getNutritionistUserId(request: { auth: { userId: number } | null }): number {
  return request.auth?.userId ?? 0;
}
