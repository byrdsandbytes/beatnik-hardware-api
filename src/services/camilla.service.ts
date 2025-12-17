import fs from 'fs/promises';
import yaml from 'js-yaml';
import { SUPPORTED_HATS } from '../types/hats';

const CAMILLA_CONFIG_PATH = process.env.CAMILLA_CONFIG_PATH || '/home/beatnik/camilladsp/configs/client_config.yml';

export class CamillaService {

    /**
     * Patched die camilladsp.yml um das richtige Ausgabegerät zu setzen.
     * Behält alle Filter/Mixer Einstellungen bei.
     */
    async updateConfig(hatId: string): Promise<void> {
        const targetHat = SUPPORTED_HATS[hatId];
        if (!targetHat) throw new Error('Invalid HAT ID');

        try {
            const fileContent = await fs.readFile(CAMILLA_CONFIG_PATH, 'utf-8');
            const config = yaml.load(fileContent) as any;

            // Ensure devices structure exists
            if (!config.devices) config.devices = {};
            if (!config.devices.playback) config.devices.playback = {};

            // Update hardware parameters in devices.playback (correct location)
            config.devices.playback.device = targetHat.camilla.device;
            config.devices.playback.format = targetHat.camilla.format;

            // Remove incorrect top-level playback if it exists (cleanup from previous bug)
            if (config.playback) delete config.playback;

            if (targetHat.camilla.channels) {
                config.devices.playback.channels = targetHat.camilla.channels;
            }

            // YAML schreiben (mit breitem Limit um Umbrüche zu vermeiden)
            const newYaml = yaml.dump(config, { lineWidth: -1 });
            await fs.writeFile(CAMILLA_CONFIG_PATH, newYaml, 'utf-8');

            console.log(`CamillaDSP updated for HAT: ${hatId} -> Device: ${targetHat.camilla.device}`);

        } catch (error) {
            console.error('Fehler beim Update der CamillaDSP Config:', error);
            throw new Error('Failed to update CamillaDSP config');
        }
    }
}