import { FastifyInstance } from 'fastify';
import { ConfigService } from '../services/config.service';
import { CamillaService, PREAMP_CAMILLA_OPTIONS, STREAM_CAMILLA_OPTIONS, STREAM_NAMES, isStreamName, StreamName } from '../services/camilla.service';
import { DetectionService } from '../services/detection.service';
import { SUPPORTED_HATS } from '../types/hats';
import { exec } from 'child_process';

const configService = new ConfigService();
const camillaService = new CamillaService();
const preampCamillaService = new CamillaService(PREAMP_CAMILLA_OPTIONS);
const streamCamillaServices = Object.fromEntries(
  STREAM_NAMES.map((name) => [name, new CamillaService(STREAM_CAMILLA_OPTIONS[name])])
) as Record<StreamName, CamillaService>;
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
      const activeConfig = await configService.getActiveConfig();
      await camillaService.setDefaultConfig(fileName, activeConfig?.id);
      await camillaService.restartService();
      return { status: 'success', fileName, camillaRestarted: true };
    } catch (error) {
      request.log.error(error);
      const message = error instanceof Error ? error.message : 'Failed to set default CamillaDSP config';
      return reply.code(400).send({ error: message });
    }
  });

  // Preamp CamillaDSP instance (camilladsp/preamp), same logic as the main instance.
  // No HAT patching here: the preamp plays back into a Snapcast pipe, not a HAT.

  // GET /api/hardware/camilla/preamp/configs
  fastify.get('/camilla/preamp/configs', async (request, reply) => {
    try {
      const configs = await preampCamillaService.listAvailableConfigs();
      return { configs };
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to list preamp CamillaDSP configs' });
    }
  });

  // GET /api/hardware/camilla/preamp/configs/default
  fastify.get('/camilla/preamp/configs/default', async (request, reply) => {
    try {
      const fileName = await preampCamillaService.getDefaultConfig();
      return { fileName };
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to get default preamp CamillaDSP config' });
    }
  });

  // PUT /api/hardware/camilla/preamp/configs/default
  // Body: { fileName: 'vinyl-riaa-static-48k.yml' }
  fastify.put<{ Body: { fileName: string } }>('/camilla/preamp/configs/default', async (request, reply) => {
    const { fileName } = request.body || {};

    if (!fileName || typeof fileName !== 'string') {
      return reply.code(400).send({ error: 'fileName is required' });
    }

    try {
      await preampCamillaService.setDefaultConfig(fileName);
      await preampCamillaService.restartService();
      return { status: 'success', fileName, camillaRestarted: true };
    } catch (error) {
      request.log.error(error);
      const message = error instanceof Error ? error.message : 'Failed to set default preamp CamillaDSP config';
      return reply.code(400).send({ error: message });
    }
  });

  // Per-stream CamillaDSP instances (camilladsp/streams/<stream>), one per Snapserver source.
  // Same logic as the preamp; a config change is applied by reloading the running instance.

  // GET /api/hardware/camilla/streams
  fastify.get('/camilla/streams', async () => {
    const streams = await Promise.all(
      STREAM_NAMES.map(async (name) => ({
        name,
        configFile: await streamCamillaServices[name].getDefaultConfig().catch(() => null)
      }))
    );
    return { streams };
  });

  // GET /api/hardware/camilla/streams/:stream/configs
  fastify.get<{ Params: { stream: string } }>('/camilla/streams/:stream/configs', async (request, reply) => {
    const { stream } = request.params;
    if (!isStreamName(stream)) {
      return reply.code(404).send({ error: 'Unknown stream' });
    }

    try {
      const configs = await streamCamillaServices[stream].listAvailableConfigs();
      return { configs };
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: `Failed to list ${stream} CamillaDSP configs` });
    }
  });

  // GET /api/hardware/camilla/streams/:stream/configs/default
  fastify.get<{ Params: { stream: string } }>('/camilla/streams/:stream/configs/default', async (request, reply) => {
    const { stream } = request.params;
    if (!isStreamName(stream)) {
      return reply.code(404).send({ error: 'Unknown stream' });
    }

    try {
      const fileName = await streamCamillaServices[stream].getDefaultConfig();
      return { fileName };
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: `Failed to get default ${stream} CamillaDSP config` });
    }
  });

  // PUT /api/hardware/camilla/streams/:stream/configs/default
  // Body: { fileName: 'stream-3-band-eq-44k.yml' }
  fastify.put<{ Params: { stream: string }; Body: { fileName: string } }>('/camilla/streams/:stream/configs/default', async (request, reply) => {
    const { stream } = request.params;
    if (!isStreamName(stream)) {
      return reply.code(404).send({ error: 'Unknown stream' });
    }

    const { fileName } = request.body || {};
    if (!fileName || typeof fileName !== 'string') {
      return reply.code(400).send({ error: 'fileName is required' });
    }

    try {
      await streamCamillaServices[stream].setDefaultConfig(fileName);
      await streamCamillaServices[stream].reload();
      return { status: 'success', stream, fileName, camillaReloaded: true };
    } catch (error) {
      request.log.error(error);
      const message = error instanceof Error ? error.message : `Failed to set default ${stream} CamillaDSP config`;
      return reply.code(400).send({ error: message });
    }
  });

  // GET /api/hardware/status
  // Gibt zurück: Was ist eingestellt? Was wurde erkannt?
  fastify.get('/status', async () => {
    const [active, detected, eepromDisabled, camillaConfigFile, preampConfigFile, streamConfigFiles] = await Promise.all([
      configService.getActiveConfig(),
      detectionService.detectConnectedHat(),
      configService.isEepromReadDisabled(),
      camillaService.getDefaultConfig(),
      // Preamp is optional, a missing setup must not break the status route
      preampCamillaService.getDefaultConfig().catch(() => null),
      Promise.all(
        STREAM_NAMES.map(async (name) => [name, await streamCamillaServices[name].getDefaultConfig().catch(() => null)] as const)
      ).then((entries) => Object.fromEntries(entries))
    ]);

    return {
      currentConfig: active,
      detectedHardware: detected,
      isMatch: active?.id === detected?.id,
      eepromReadDisabled: eepromDisabled,
      camillaConfigFile,
      preampConfigFile,
      streamConfigFiles
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
      await camillaService.restartService();

      return { 
        status: 'success', 
        message: 'Configuration applied. CamillaDSP restarted. Reboot required.', 
        camillaRestarted: true,
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