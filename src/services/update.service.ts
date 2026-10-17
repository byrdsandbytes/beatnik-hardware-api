import { execFile } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export type UpdateTarget = 'bleno' | 'controller' | 'api';
export type UpdateRequest = UpdateTarget | 'all';
export interface VersionInfo {
  target: UpdateTarget;
  installed: boolean;
  version: string | null;
  // Controller only: Docker image reference and ID of the running container
  image?: string;
  imageId?: string;
}

export type UpdateState = 'idle' | 'running' | 'success' | 'failed';

export interface UpdateStatus {
  target: UpdateTarget;
  state: UpdateState;
  startedAt?: string;
  finishedAt?: string;
  message?: string;
  output?: string;
}

export class UpdateError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message);
  }
}

// The API runs as root, but the controller lives in the beatnik user's home directory
const BEATNIK_USER = process.env.BEATNIK_USER || 'beatnik';
const BEATNIK_HOME = process.env.BEATNIK_HOME || `/home/${BEATNIK_USER}`;
const CONTROLLER_CONTAINER = process.env.CONTROLLER_CONTAINER || 'beatnik-controller';
const UPDATE_TIMEOUT_MS = 10 * 60 * 1000;
const MAX_OUTPUT_CHARS = 4000;

export const UPDATE_TARGETS: UpdateTarget[] = ['bleno', 'controller', 'api'];

// The API itself goes last because its update restarts this process
const ALL_ORDER: UpdateTarget[] = ['bleno', 'controller', 'api'];

const DIRS = {
  controller: path.join(BEATNIK_HOME, 'beatnik-controller'),
};

// Targets installed as Debian packages and updated from the latest GitHub release
interface DebTarget {
  packageName: string;
  repo: string;
  // The API restarts itself during the update, so apt must run outside this service
  detached: boolean;
}

const DEB_TARGETS: Partial<Record<UpdateTarget, DebTarget>> = {
  bleno: { packageName: 'beatnik-bleno', repo: 'byrdsandbytes/beatnik-bleno', detached: false },
  api: { packageName: 'beatnik-hardware-api', repo: 'byrdsandbytes/beatnik-hardware-api', detached: true },
};

const DOWNLOAD_DIR = '/tmp/beatnik-update';

const tail = (text: string) => text.trim().slice(-MAX_OUTPUT_CHARS);

export class UpdateService {
  private statuses = new Map<UpdateTarget, UpdateStatus>(
    UPDATE_TARGETS.map((target) => [target, { target, state: 'idle' as UpdateState }])
  );
  private busy = false;

  isBusy(): boolean {
    return this.busy;
  }

  getStatus(): UpdateStatus[] {
    return UPDATE_TARGETS.map((target) => ({ ...this.statuses.get(target)! }));
  }

  /**
   * Validates the request and starts the update in the background.
   * Returns the targets that will be updated.
   */
  async start(request: UpdateRequest): Promise<UpdateTarget[]> {
    if (this.busy) {
      throw new UpdateError('An update is already running', 409);
    }

    const targets = request === 'all' ? ALL_ORDER : [request];
    for (const target of targets) {
      await this.assertAvailable(target);
    }

    this.busy = true;
    for (const target of targets) {
      this.statuses.set(target, { target, state: 'idle' });
    }
    void this.runSequence(targets);
    return targets;
  }

  private async assertAvailable(target: UpdateTarget): Promise<void> {
    if (target === 'controller') return; // Docker only needs the container, not a directory

    if (DEB_TARGETS[target]) {
      const { packageName } = DEB_TARGETS[target]!;
      if (!(await this.getInstalledVersion(packageName))) {
        throw new UpdateError(`Cannot update ${target}: package ${packageName} is not installed`, 404);
      }
      return;
    }
  }

  private async runSequence(targets: UpdateTarget[]): Promise<void> {
    try {
      for (const target of targets) {
        const ok = await this.runTarget(target);
        if (!ok) break;
      }
    } finally {
      this.busy = false;
    }
  }

  private async runTarget(target: UpdateTarget): Promise<boolean> {
    const status: UpdateStatus = {
      target,
      state: 'running',
      startedAt: new Date().toISOString(),
    };
    this.statuses.set(target, status);

    try {
      const result = await this.execute(target);
      Object.assign(status, { state: 'success', ...result });
      return true;
    } catch (error: any) {
      const output = tail(`${error?.stdout ?? ''}\n${error?.stderr ?? ''}`);
      Object.assign(status, {
        state: 'failed',
        message: this.failureMessage(error),
        output,
      });
      console.error(`Update of ${target} failed:`, error);
      return false;
    } finally {
      status.finishedAt = new Date().toISOString();
    }
  }

  private failureMessage(error: any): string {
    const lastStderrLine = String(error?.stderr ?? '').trim().split('\n').pop();
    if (lastStderrLine) return lastStderrLine;
    return error instanceof Error ? error.message.split('\n')[0] : 'Update failed';
  }

  private async execute(target: UpdateTarget): Promise<{ message: string; output?: string }> {
    switch (target) {
      case 'bleno':
      case 'api':
        return this.updateDeb(target);
      case 'controller':
        return this.updateController();
    }
  }

  /** Runs docker with root privileges (via sudo when not already root). */
  private async docker(args: string[], cwd?: string) {
    const isRoot = typeof process.getuid === 'function' && process.getuid() === 0;
    const [file, fileArgs] = isRoot ? ['docker', args] : ['sudo', ['-n', 'docker', ...args]];
    return execFileAsync(file, fileArgs, {
      cwd,
      timeout: UPDATE_TIMEOUT_MS,
      maxBuffer: 10 * 1024 * 1024,
    });
  }

  private async updateController() {
    const dir = DIRS.controller;
    const hasCompose = await fs
      .access(path.join(dir, 'docker-compose.yml'))
      .then(() => true, () => false);

    return hasCompose ? this.updateControllerWithCompose(dir) : this.updateControllerWithPull();
  }

  /** Pulls the image and recreates the container if the image changed. */
  private async updateControllerWithCompose(dir: string) {
    const containerImageId = async () => {
      try {
        const { stdout } = await this.docker(['inspect', '--format', '{{.Image}}', CONTROLLER_CONTAINER]);
        return stdout.trim();
      } catch {
        return '';
      }
    };

    const before = await containerImageId();
    const pull = await this.docker(['compose', 'pull'], dir);
    const up = await this.docker(['compose', 'up', '-d'], dir);
    const after = await containerImageId();

    return {
      message: before !== after
        ? 'Controller updated and container recreated'
        : 'Controller is already up to date',
      output: tail(`${pull.stdout}\n${pull.stderr}\n${up.stdout}\n${up.stderr}`),
    };
  }

  /** Fallback when there is no docker-compose.yml: pull only, the container is not recreated. */
  private async updateControllerWithPull() {
    const image = await this.getControllerImage();
    const imageId = async () => {
      try {
        const { stdout } = await this.docker(['image', 'inspect', '--format', '{{.Id}}', image]);
        return stdout.trim();
      } catch {
        return '';
      }
    };

    const before = await imageId();
    const { stdout, stderr } = await this.docker(['pull', image]);
    const after = await imageId();

    return {
      message: before !== after
        ? `Pulled new controller image ${image}. Recreate the container to use it.`
        : `Controller image ${image} is already up to date`,
      output: tail(`${stdout}\n${stderr}`),
    };
  }

  private async getControllerImage(): Promise<string> {
    if (process.env.CONTROLLER_IMAGE) return process.env.CONTROLLER_IMAGE;
    try {
      const { stdout } = await this.docker(['inspect', '--format', '{{.Config.Image}}', CONTROLLER_CONTAINER]);
      const image = stdout.trim();
      if (image) return image;
    } catch {
      // fall through
    }
    throw new Error(
      `Could not determine controller image from container "${CONTROLLER_CONTAINER}". Set CONTROLLER_IMAGE.`
    );
  }

  /** Installed versions of the API, bleno (Debian packages) and the controller (Docker image). */
  async getVersions(): Promise<VersionInfo[]> {
    return Promise.all(UPDATE_TARGETS.map((target) => this.getVersion(target)));
  }

  private async getVersion(target: UpdateTarget): Promise<VersionInfo> {
    const deb = DEB_TARGETS[target];
    if (deb) {
      let version = await this.getInstalledVersion(deb.packageName);
      if (!version && target === 'api') {
        // Not installed as a package (e.g. source install): use package.json
        version = await this.getPackageJsonVersion();
      }
      return { target, installed: version !== null, version };
    }
    return this.getControllerVersion();
  }

  private async getPackageJsonVersion(): Promise<string | null> {
    try {
      const file = path.resolve(__dirname, '../../package.json');
      return JSON.parse(await fs.readFile(file, 'utf-8')).version ?? null;
    } catch {
      return null;
    }
  }

  private async getControllerVersion(): Promise<VersionInfo> {
    try {
      const { stdout } = await this.docker([
        'inspect',
        '--format',
        '{{.Config.Image}}|{{.Image}}|{{index .Config.Labels "org.opencontainers.image.version"}}',
        CONTROLLER_CONTAINER,
      ]);
      const [image, imageId, label] = stdout.trim().split('|');
      const tag = image.includes(':') ? image.split(':').pop()! : 'latest';
      const labelVersion = label && label !== '<no value>' ? label : null;
      return { target: 'controller', installed: true, version: labelVersion ?? tag, image, imageId };
    } catch {
      return { target: 'controller', installed: false, version: null };
    }
  }

  private async getInstalledVersion(packageName: string): Promise<string | null> {
    try {
      const { stdout } = await execFileAsync('dpkg-query', ['-W', '-f=${Version}', packageName]);
      return stdout.trim() || null;
    } catch {
      return null;
    }
  }

  private async getArchitecture(): Promise<string> {
    const { stdout } = await execFileAsync('dpkg', ['--print-architecture']);
    return stdout.trim();
  }

  /** Finds the latest release and the .deb asset matching this device's architecture. */
  private async getLatestDeb(target: DebTarget): Promise<{ version: string; name: string; url: string }> {
    const response = await fetch(`https://api.github.com/repos/${target.repo}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'beatnik-hardware-api' },
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) {
      throw new Error(`GitHub release lookup failed (HTTP ${response.status})`);
    }

    const release = (await response.json()) as {
      tag_name: string;
      assets: { name: string; browser_download_url: string }[];
    };
    const version = release.tag_name.replace(/^v/, '');
    const arch = await this.getArchitecture();
    const asset = release.assets.find(
      (a) => a.name.startsWith(`${target.packageName}_`) && (a.name.endsWith(`_${arch}.deb`) || a.name.endsWith('_all.deb'))
    );
    if (!asset) {
      throw new Error(`No ${target.packageName} .deb for ${arch} found in release ${release.tag_name}`);
    }
    return { version, name: asset.name, url: asset.browser_download_url };
  }

  private async download(url: string, name: string): Promise<string> {
    await fs.mkdir(DOWNLOAD_DIR, { recursive: true, mode: 0o755 });
    const filePath = path.join(DOWNLOAD_DIR, path.basename(name));

    const response = await fetch(url, { signal: AbortSignal.timeout(UPDATE_TIMEOUT_MS) });
    if (!response.ok) {
      throw new Error(`Download failed (HTTP ${response.status})`);
    }
    await fs.writeFile(filePath, Buffer.from(await response.arrayBuffer()));
    await fs.chmod(filePath, 0o644);
    return filePath;
  }

  /**
   * Downloads the latest release .deb and installs it with apt, which upgrades the
   * package in place and restarts its service (same as the manual update guides).
   */
  private async updateDeb(target: UpdateTarget) {
    const deb = DEB_TARGETS[target]!;
    const installed = await this.getInstalledVersion(deb.packageName);
    const latest = await this.getLatestDeb(deb);

    if (installed === latest.version) {
      return { message: `${deb.packageName} is already up to date (${installed})` };
    }

    const filePath = await this.download(latest.url, latest.name);
    const aptArgs = [
      'install', '-y',
      '-o', 'Dpkg::Options::=--force-confold', // keep locally edited service files, no prompt
      filePath,
    ];
    const isRoot = typeof process.getuid === 'function' && process.getuid() === 0;
    const sudo = isRoot ? [] : ['sudo', '-n'];

    if (deb.detached) {
      // Own systemd unit so apt survives the restart of this service
      const unit = `beatnik-api-update-${Date.now()}`;
      const [file, ...prefix] = [...sudo, 'systemd-run'];
      await execFileAsync(
        file,
        [...prefix, `--unit=${unit}`, '--collect', '--setenv=DEBIAN_FRONTEND=noninteractive', 'apt-get', ...aptArgs],
        { timeout: 30_000 }
      );
      return {
        message: `Updating ${deb.packageName} ${installed} -> ${latest.version}. The service will restart shortly.`,
        output: `Running as systemd unit ${unit}. Follow with: journalctl -u ${unit}`,
      };
    }

    const [file, ...prefix] = [...sudo, 'env', 'DEBIAN_FRONTEND=noninteractive', 'apt-get'];
    const { stdout, stderr } = await execFileAsync(file, [...prefix, ...aptArgs], {
      timeout: UPDATE_TIMEOUT_MS,
      maxBuffer: 10 * 1024 * 1024,
    });
    return {
      message: `${deb.packageName} updated ${installed} -> ${latest.version}`,
      output: tail(`${stdout}\n${stderr}`),
    };
  }
}

export const updateService = new UpdateService();
