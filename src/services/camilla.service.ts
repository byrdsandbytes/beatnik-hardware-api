import fs from 'fs/promises';
import { constants as fsConstants } from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { exec, execFile } from 'child_process';
import { promisify } from 'util';
import { SUPPORTED_HATS } from '../types/hats';

// Configs shipped with this project (<install dir>/camilladsp); copied into CAMILLA_HOME on start
const BUNDLED_CAMILLA_DIR = path.resolve(__dirname, '../../camilladsp');
// Writable runtime location of the CamillaDSP configs
const CAMILLA_HOME = process.env.CAMILLA_HOME || '/var/lib/beatnik-hardware-api/camilladsp';

const CAMILLA_CONFIG_DIR = process.env.CAMILLA_CONFIG_DIR || path.join(CAMILLA_HOME, 'configs');
const CAMILLA_CONFIG_PATH = process.env.CAMILLA_CONFIG_PATH || path.join(CAMILLA_CONFIG_DIR, 'client_config.yml');
const CAMILLA_SERVICE_NAME = process.env.CAMILLA_SERVICE_NAME || 'camilladsp';

// Second CamillaDSP instance used as preamp (e.g. vinyl line-in) in front of Snapcast
const PREAMP_CONFIG_DIR = process.env.CAMILLA_PREAMP_CONFIG_DIR || path.join(CAMILLA_HOME, 'preamp');
const PREAMP_CONFIG_PATH = process.env.CAMILLA_PREAMP_CONFIG_PATH || path.join(PREAMP_CONFIG_DIR, 'client_config.yml');
const PREAMP_SERVICE_NAME = process.env.CAMILLA_PREAMP_SERVICE_NAME || 'camilladsp-preamp';
const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

// Per-stream CamillaDSP instances (one per Snapserver source), started by the beatnik-stream-dsp wrapper
// and not by systemd. Names must match the wrapper's stream names.
const STREAMS_CONFIG_DIR = process.env.CAMILLA_STREAMS_CONFIG_DIR || path.join(CAMILLA_HOME, 'streams');
export const STREAM_NAMES = ['airplay', 'airplay2', 'spotify'] as const;
export type StreamName = (typeof STREAM_NAMES)[number];

export function isStreamName(value: string): value is StreamName {
    return (STREAM_NAMES as readonly string[]).includes(value);
}

async function copyMissing(sourceDir: string, targetDir: string): Promise<void> {
    await fs.mkdir(targetDir, { recursive: true });
    const entries = await fs.readdir(sourceDir, { withFileTypes: true });

    for (const entry of entries) {
        const source = path.join(sourceDir, entry.name);
        const target = path.join(targetDir, entry.name);

        if (entry.isDirectory()) {
            await copyMissing(source, target);
            continue;
        }

        try {
            // COPYFILE_EXCL keeps user-modified configs and symlinks untouched
            await fs.copyFile(source, target, fsConstants.COPYFILE_EXCL);
        } catch (error: any) {
            if (error.code !== 'EEXIST') throw error;
        }
    }
}

/**
 * Seeds the runtime config directories with the bundled configs.
 * Existing files are never overwritten, so user changes survive updates.
 */
export async function seedCamillaConfigs(): Promise<void> {
    const targets: Array<[string, string]> = [
        ['configs', CAMILLA_CONFIG_DIR],
        ['preamp', PREAMP_CONFIG_DIR],
        ['coeffs', path.join(CAMILLA_HOME, 'coeffs')],
        // Every stream starts with the same bundled profiles
        ...STREAM_NAMES.map((name): [string, string] => ['streams/default', path.join(STREAMS_CONFIG_DIR, name)]),
    ];

    for (const [name, target] of targets) {
        await copyMissing(path.join(BUNDLED_CAMILLA_DIR, name), target);
    }
}

export interface CamillaInstanceOptions {
    configDir: string;
    configPath: string;
    // Instances without a systemd unit are reloaded by signalling their process
    serviceName?: string;
}

export const MAIN_CAMILLA_OPTIONS: CamillaInstanceOptions = {
    configDir: CAMILLA_CONFIG_DIR,
    configPath: CAMILLA_CONFIG_PATH,
    serviceName: CAMILLA_SERVICE_NAME,
};

export const PREAMP_CAMILLA_OPTIONS: CamillaInstanceOptions = {
    configDir: PREAMP_CONFIG_DIR,
    configPath: PREAMP_CONFIG_PATH,
    serviceName: PREAMP_SERVICE_NAME,
};

export const STREAM_CAMILLA_OPTIONS = Object.fromEntries(
    STREAM_NAMES.map((name) => {
        const configDir = path.join(STREAMS_CONFIG_DIR, name);
        return [name, { configDir, configPath: path.join(configDir, 'client_config.yml') }];
    })
) as Record<StreamName, CamillaInstanceOptions>;

export class CamillaService {
    private readonly configDir: string;
    private readonly configPath: string;
    private readonly serviceName?: string;
    private readonly activeConfigFileName: string;

    constructor(options: CamillaInstanceOptions = MAIN_CAMILLA_OPTIONS) {
        this.configDir = options.configDir;
        this.configPath = options.configPath;
        this.serviceName = options.serviceName;
        this.activeConfigFileName = path.basename(options.configPath);
    }

    /**
     * Makes the instance pick up the active config: systemd instances are restarted,
     * stream instances (child of a Snapserver source) reload it on SIGHUP.
     */
    async reload(): Promise<void> {
        if (this.serviceName) {
            return this.restartService();
        }

        try {
            const escapedPath = this.configPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            // execFile avoids a shell whose command line would also match the pattern
            await execFileAsync('sudo', ['pkill', '-HUP', '-f', '--', `camilladsp .*${escapedPath}$`]);
        } catch (error: any) {
            // pkill exits with 1 when no process matches: the stream is not running and loads the config on start
            if (error?.code !== 1) {
                console.error(`Failed to reload CamillaDSP config ${this.configPath}:`, error);
                throw new Error('Failed to reload CamillaDSP');
            }
        }
    }

    async restartService(): Promise<void> {
        if (!this.serviceName) {
            throw new Error('CamillaDSP instance has no systemd service');
        }

        try {
            await execAsync(`sudo systemctl restart ${this.serviceName}`);
        } catch (error) {
            console.error(`Failed to restart ${this.serviceName} service:`, error);
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

        if (normalizedFileName === this.activeConfigFileName) {
            throw new Error(`${this.activeConfigFileName} cannot be selected as source config`);
        }

        return normalizedFileName;
    }

    async listAvailableConfigs(): Promise<string[]> {
        const entries = await fs.readdir(this.configDir, { withFileTypes: true });

        return entries
            .filter((entry) => entry.isFile() || entry.isSymbolicLink())
            .map((entry) => entry.name)
            .filter((fileName) => {
                const extension = path.extname(fileName).toLowerCase();
                return extension === '.yml' || extension === '.yaml';
            })
            .filter((fileName) => fileName !== this.activeConfigFileName)
            .sort((left, right) => left.localeCompare(right));
    }

    async getDefaultConfig(): Promise<string> {
        const currentConfigStat = await fs.lstat(this.configPath);

        if (currentConfigStat.isSymbolicLink()) {
            const linkTarget = await fs.readlink(this.configPath);
            return path.basename(linkTarget);
        }

        return path.basename(this.configPath);
    }

    async setDefaultConfig(fileName: string, hatId?: string): Promise<void> {
        const safeFileName = this.validateConfigFileName(fileName);
        const targetPath = path.resolve(this.configDir, safeFileName);
        const configDirPath = path.resolve(this.configDir) + path.sep;

        if (!targetPath.startsWith(configDirPath)) {
            throw new Error('Selected config path is outside of config directory');
        }

        const targetConfigStat = await fs.stat(targetPath);
        if (!targetConfigStat.isFile()) {
            throw new Error('Selected config is not a file');
        }

        const temporaryLinkPath = `${this.configPath}.tmp`;

        try {
            await fs.unlink(temporaryLinkPath);
        } catch {
            // ignore if temporary link does not exist
        }

        await fs.symlink(targetPath, temporaryLinkPath);
        await fs.rename(temporaryLinkPath, this.configPath);

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
            const fileContent = await fs.readFile(this.configPath, 'utf-8');
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
            await fs.writeFile(this.configPath, newYaml, 'utf-8');

            console.log(`CamillaDSP updated for HAT: ${hatId} -> Device: ${targetHat.camilla.device}`);

        } catch (error) {
            console.error('Fehler beim Update der CamillaDSP Config:', error);
            throw new Error('Failed to update CamillaDSP config');
        }
    }
}