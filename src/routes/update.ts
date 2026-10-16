import { FastifyInstance } from 'fastify';
import { UPDATE_TARGETS, UpdateError, UpdateRequest, updateService } from '../services/update.service';

export async function updateRoutes(fastify: FastifyInstance) {
  // State of the last update per target
  fastify.get('/status', async () => {
    return { busy: updateService.isBusy(), targets: updateService.getStatus() };
  });

  // Start an update in the background: bleno | controller | api | all
  fastify.post<{ Params: { target: string } }>('/:target', async (request, reply) => {
    const { target } = request.params;
    if (target !== 'all' && !UPDATE_TARGETS.includes(target as any)) {
      return reply.code(400).send({
        error: `Unknown target "${target}". Use one of: ${[...UPDATE_TARGETS, 'all'].join(', ')}`,
      });
    }

    try {
      const targets = await updateService.start(target as UpdateRequest);
      return reply.code(202).send({
        success: true,
        message: `Update started for: ${targets.join(', ')}`,
        targets,
      });
    } catch (error) {
      if (error instanceof UpdateError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to start update' });
    }
  });
}
