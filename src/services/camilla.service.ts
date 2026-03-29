import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import { exec } from 'child_process';
import { promisify } from 'util';
import { SUPPORTED_HATS } from '../types/hats';

const CAMILLA_CONFIG_DIR = process.env.CAMILLA_CONFIG_DIR || '/home/beatnik/camilladsp/configs';
const CAMILLA_CONFIG_PATH = process.env.CAMILLA_CONFIG_PATH || path.join(CAMILLA_CONFIG_DIR, 'client_config.yml');
const CAMILLA_SERVICE_NAME = process.env.CAMILLA_SERVICE_NAME || 'camilladsp';
const execAsync = promisify(exec);

export class CamillaService {
    async restartService(): Promise<void> {
        try {
            await execAsync(`sudo systemctl restart ${CAMILLA_SERVICE_NAME}`);
        } catch (error) {
            console.error('Failed to restart CamillaDSP service:', error);
            throw new Error('Failed to restart CamillaDSP service');
        }
    }

    private validateConfigFileName(fileName: string): string {
        const trimmedFileName = fileName?.trim();
        if (!trimmedFileName) {
            throw new Error('Config file name is required');
        }

        const normalizedFileName = path.basename(trimmedFileName);
        if (normalizedFileName !== trimmedFileName) {
            throw new Error('Invalid config file name');
        }

        const extension = path.extname(normalizedFileName).toLowerCase();
        if (extension !== '.yml' && extension !== '.yaml') {
            throw new Error('Only .yml or .yaml files are allowed');
        }

        if (normalizedFileName === 'client_config.yml') {
            throw new Error('client_config.yml cannot be selected as source config');
        }

        return normalizedFileName;
    }

    async listAvailableConfigs(): Promise<string[]> {
        const entries = await fs.readdir(CAMILLA_CONFIG_DIR, { withFileTypes: true });

        return entries
            .filter((entry) => entry.isFile() || entry.isSymbolicLink())
            .map((entry) => entry.name)
            .filter((fileName) => {
                const extension = path.extname(fileName).toLowerCase();
                return extension === '.yml' || extension === '.yaml';
            })
            .filter((fileName) => fileName !== 'client_config.yml')
            .sort((left, right) => left.localeCompare(right));
    }

    async getDefaultConfig(): Promise<string> {
        const currentConfigStat = await fs.lstat(CAMILLA_CONFIG_PATH);

        if (currentConfigStat.isSymbolicLink()) {
            const linkTarget = await fs.readlink(CAMILLA_CONFIG_PATH);
            return path.basename(linkTarget);
        }

        return path.basename(CAMILLA_CONFIG_PATH);
    }

    async setDefaultConfig(fileName: string, hatId?: string): Promise<void> {
        const safeFileName = this.validateConfigFileName(fileName);
        const targetPath = path.resolve(CAMILLA_CONFIG_DIR, safeFileName);
        const configDirPath = path.resolve(CAMILLA_CONFIG_DIR) + path.sep;

        if (!targetPath.startsWith(configDirPath)) {
            throw new Error('Selected config path is outside of config directory');
        }

        const targetConfigStat = await fs.stat(targetPath);
        if (!targetConfigStat.isFile()) {
            throw new Error('Selected config is not a file');
        }

        const temporaryLinkPath = `${CAMILLA_CONFIG_PATH}.tmp`;

        try {
            await fs.unlink(temporaryLinkPath);
        } catch {
            // ignore if temporary link does not exist
        }

        await fs.symlink(targetPath, temporaryLinkPath);
        await fs.rename(temporaryLinkPath, CAMILLA_CONFIG_PATH);

        if (hatId) {
            await this.updateConfig(hatId);
        }
    }

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