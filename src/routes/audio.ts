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

  // GET /api/hardware/camilla/configs
  // Liste verfügbarer CamillaDSP Config-Dateien
  fastify.get('/camilla/configs', async (request, reply) => {
    try {
      const configs = await camillaService.listAvailableConfigs();
      return { configs };
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to list CamillaDSP configs' });
    }
  });

  // GET /api/hardware/camilla/configs/default
  // Aktive Standard-Config ermitteln
  fastify.get('/camilla/configs/default', async (request, reply) => {
    try {
      const fileName = await camillaService.getDefaultConfig();
      return { fileName };
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to get default CamillaDSP config' });
    }
  });

  // PUT /api/hardware/camilla/configs/default
  // Body: { fileName: 'my_profile.yml' }
  // Setzt die Standard-Config via Symlink auf client_config.yml
  fastify.put<{ Body: { fileName: string } }>('/camilla/configs/default', async (request, reply) => {
    const { fileName } = request.body || {};

    if (!fileName || typeof fileName !== 'string') {
      return reply.code(400).send({ error: 'fileName is required' });
    }

    try {
      await camillaService.setDefaultConfig(fileName);
      return { status: 'success', fileName };
    } catch (error) {
      request.log.error(error);
      const message = error instanceof Error ? error.message : 'Failed to set default CamillaDSP config';
      return reply.code(400).send({ error: message });
    }
  });

  // GET /api/hardware/status
  // Gibt zurück: Was ist eingestellt? Was wurde erkannt?
  fastify.get('/status', async () => {
    const [active, detected, eepromDisabled, camillaConfigFile] = await Promise.all([
      configService.getActiveConfig(),
      detectionService.detectConnectedHat(),
      configService.isEepromReadDisabled(),
      camillaService.getDefaultConfig()
    ]);

    return {
      currentConfig: active,
      detectedHardware: detected,
      isMatch: active?.id === detected?.id,
      eepromReadDisabled: eepromDisabled,
      camillaConfigFile
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