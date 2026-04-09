import { FastifyInstance } from 'fastify';
import { systemService } from '../services/system.service';
import { gpioService } from '../services/gpio.service';
import { z } from 'zod';

const SetColorSchema = z.object({
  command: z.literal('set_color'),
  params: z.object({
    r: z.number().min(0).max(1),
    g: z.number().min(0).max(1),
    b: z.number().min(0).max(1),
  }),
});

const PulseSchema = z.object({
  command: z.literal('pulse'),
  params: z.object({
    on_color: z.tuple([z.number(), z.number(), z.number()]),
    off_color: z.tuple([z.number(), z.number(), z.number()]).optional(),
    fade_in: z.number().optional(),
    fade_out: z.number().optional(),
  }),
});

const BlinkSchema = z.object({
  command: z.literal('blink'),
  params: z.object({
    color: z.tuple([z.number(), z.number(), z.number()]),
    on_time: z.number().optional(),
    off_time: z.number().optional(),
  }),
});

const OffSchema = z.object({
  command: z.literal('off'),
});

const LedCommandSchema = z.discriminatedUnion('command', [
  SetColorSchema,
  PulseSchema,
  BlinkSchema,
  OffSchema,
]);

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
      // Can't reliably send response if reboot executed, but if it failed:
    }
  });

  fastify.post('/led', async (request, reply) => {
    try {
      const result = LedCommandSchema.safeParse(request.body);
      
      if (!result.success) {
        return reply.code(400).send({ error: 'Invalid payload', details: result.error.errors });
      }

      const { command, params } = result.data as any;

      switch (command) {
        case 'set_color':
          gpioService.setColor(params.r, params.g, params.b);
          break;
        case 'pulse':
          gpioService.pulse(params.on_color, params.off_color || [0, 0, 0], params.fade_in, params.fade_out);
          break;
        case 'blink':
          gpioService.blink(params.color, params.on_time, params.off_time);
          break;
        case 'off':
          gpioService.turnOff();
          break;
      }

      return { success: true };
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to process LED command' });
    }
  });
}
