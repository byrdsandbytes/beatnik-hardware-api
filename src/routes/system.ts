import { FastifyInstance } from 'fastify';
import { systemService } from '../services/system.service';

export async function systemRoutes(fastify: FastifyInstance) {
  fastify.get('/info', async (request, reply) => {
    try {
      const info = await systemService.getInfo();
      return info;
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to retrieve system info' });
    }
  });

  fastify.post('/reboot', async (request, reply) => {
    try {
      // Reply immediately before reboot kills the process
      reply.send({ message: 'Rebooting...' });
      await systemService.reboot();
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to reboot' });
    }
  });
}
