import { FastifyInstance } from 'fastify';
import { ConfigService } from '../services/config.service';
import { CamillaService } from '../services/camilla.service';
import { DetectionService } from '../services/detection.service';
import { SUPPORTED_HATS } from '../types/hats';
import { exec } from 'child_process';

const configService = new ConfigService();
const camillaService = new CamillaService();
const detectionService = new DetectionService();

export async function audioRoutes(fastify: FastifyInstance) {
  
  // GET /api/hardware/hats
  // Liste aller möglichen Optionen
  fastify.get('/hats', async () => {
    return Object.values(SUPPORTED_HATS);
  });

  // GET /api/hardware/status
  // Gibt zurück: Was ist eingestellt? Was wurde erkannt?
  fastify.get('/status', async () => {
    const [active, detected, eepromDisabled] = await Promise.all([
      configService.getActiveConfig(),
      detectionService.detectConnectedHat(),
      configService.isEepromReadDisabled()
    ]);

    return {
      currentConfig: active,
      detectedHardware: detected,
      isMatch: active?.id === detected?.id,
      eepromReadDisabled: eepromDisabled
    };
  });

  // POST /api/hardware/apply
  // Body: { hatId: 'hifiberry-amp' }
  // Führt das volle Update durch (System + Audio Engine)
  fastify.post<{ Body: { hatId: string } }>('/apply', async (request, reply) => {
    const { hatId } = request.body;
    
    if (!hatId || !SUPPORTED_HATS[hatId]) {
      return reply.code(400).send({ error: 'Invalid HAT ID' });
    }

    try {
      request.log.info(`Applying configuration for ${hatId}...`);
      
      // 1. config.txt (Boot Overlay)
      await configService.setHat(hatId);
      
      // 2. camilladsp.yml (Audio Routing)
      await camillaService.updateConfig(hatId);

      return { 
        status: 'success', 
        message: 'Configuration applied. Reboot required.', 
        rebootRequired: true 
      };
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to apply configuration' });
    }
  });

  // POST /api/hardware/reboot
  fastify.post('/reboot', async (request, reply) => {
    reply.send({ status: 'rebooting' });
    setTimeout(() => { exec('reboot'); }, 1000);
  });
}