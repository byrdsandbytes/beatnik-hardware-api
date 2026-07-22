import { FastifyInstance } from 'fastify';
import { snapcastService } from '../services/snapcast.service';

export async function snapcastRoutes(fastify: FastifyInstance) {
  fastify.get('/status', async (request, reply) => {
    try {
      const status = await snapcastService.getStatus();
      return status;
    } catch (error) {
      reply.code(500).send({ error: 'Failed to fetch status' });
    }
  });

  fastify.post('/enable', async (request, reply) => {
    try {
      await snapcastService.enable();
      const status = await snapcastService.getStatus();
      return { success: true, message: 'Snapserver enabled', ...status };
    } catch (error) {
      reply.code(500).send({ error: 'Failed to enable snapserver' });
    }
  });

  fastify.post('/disable', async (request, reply) => {
    try {
      await snapcastService.disable();
      const status = await snapcastService.getStatus();
      return { success: true, message: 'Snapserver disabled', ...status };
    } catch (error) {
      reply.code(500).send({ error: 'Failed to disable snapserver' });
    }
  });

  fastify.post('/restart-server', async (request, reply) => {
    try {
      await snapcastService.restartServer();
      return { success: true, message: 'Snapserver restarted' };
    } catch (error) {
      reply.code(500).send({ error: 'Failed to restart snapserver' });
    }
  });

  fastify.post('/restart-client', async (request, reply) => {
    try {
      await snapcastService.restartClient();
      return { success: true, message: 'Snapclient restarted' };
    } catch (error) {
      reply.code(500).send({ error: 'Failed to restart snapclient' });
    }
  });
}
