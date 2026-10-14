import { execFile } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export type UpdateTarget = 'bleno' | 'controller' | 'camilladsp' | 'api';
export type UpdateRequest = UpdateTarget | 'all';
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

// The API runs as root, but all repositories live in the beatnik user's home directory
const BEATNIK_USER = process.env.BEATNIK_USER || 'beatnik';
const BEATNIK_HOME = process.env.BEATNIK_HOME || `/home/${BEATNIK_USER}`;
const CONTROLLER_CONTAINER = process.env.CONTROLLER_CONTAINER || 'beatnik-controller';
const UPDATE_TIMEOUT_MS = 10 * 60 * 1000;
const MAX_OUTPUT_CHARS = 4000;

export const UPDATE_TARGETS: UpdateTarget[] = ['bleno', 'controller', 'camilladsp', 'api'];

// The API itself goes last because its update restarts this process
const ALL_ORDER: UpdateTarget[] = ['bleno', 'controller', 'camilladsp', 'api'];

const DIRS: Record<UpdateTarget, string> = {
  bleno: path.join(BEATNIK_HOME, 'beatnik-bleno'),
  controller: path.join(BEATNIK_HOME, 'beatnik-controller'),
  camilladsp: path.join(BEATNIK_HOME, 'camilladsp'),
  api: path.join(BEATNIK_HOME, 'beatnik-hardware-api'),
};

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
      if (target === 'controller') continue; // Docker only needs the container, not a directory
      await this.assertSetupAvailable(target);
    }

    this.busy = true;
    for (const target of targets) {
      this.statuses.set(target, { target, state: 'idle' });
    }
    void this.runSequence(targets);
    return targets;
  }

  private async assertSetupAvailable(target: UpdateTarget): Promise<void> {
    const dir = DIRS[target];
    const required = target === 'camilladsp' ? '.git' : 'setup.sh';
    try {
      await fs.access(path.join(dir, required));
    } catch {
      throw new UpdateError(`Cannot update ${target}: ${path.join(dir, required)} not found`, 404);
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
        message: error instanceof Error ? error.message.split('\n')[0] : 'Update failed',
        output,
      });
      console.error(`Update of ${target} failed:`, error);
      return false;
    } finally {
      status.finishedAt = new Date().toISOString();
    }
  }

  private async execute(target: UpdateTarget): Promise<{ message: string; output?: string }> {
    switch (target) {
      case 'bleno':
        return this.updateViaSetup(target);
      case 'controller':
        return this.updateController();
      case 'camilladsp':
        return this.updateCamilla();
      case 'api':
        return this.updateApi();
    }
  }

  /** Runs a command as the beatnik user (the API itself runs as root). */
  private async asUser(cmd: string, args: string[], cwd: string) {
    const isRoot = typeof process.getuid === 'function' && process.getuid() === 0;
    const [file, fileArgs] = isRoot
      ? ['sudo', ['-n', '-u', BEATNIK_USER, '-H', cmd, ...args]]
      : [cmd, args];
    const { stdout, stderr } = await execFileAsync(file, fileArgs, {
      cwd,
      timeout: UPDATE_TIMEOUT_MS,
      maxBuffer: 10 * 1024 * 1024,
    });
    return tail(`${stdout}\n${stderr}`);
  }

  private async updateViaSetup(target: UpdateTarget) {
    const output = await this.asUser('bash', ['setup.sh'], DIRS[target]);
    return { message: `${target} updated`, output };
  }

  private async updateCamilla() {
    const dir = DIRS.camilladsp;
    const output = await this.asUser('git', ['pull', '--ff-only', 'origin', 'master'], dir);
    return { message: 'CamillaDSP repository updated', output };
  }

  private async updateController() {
    const image = await this.getControllerImage();
    const imageId = async () => {
      try {
        const { stdout } = await execFileAsync('sudo', ['-n', 'docker', 'image', 'inspect', '--format', '{{.Id}}', image]);
        return stdout.trim();
      } catch {
        return '';
      }
    };

    const before = await imageId();
    const { stdout, stderr } = await execFileAsync('sudo', ['-n', 'docker', 'pull', image], {
      timeout: UPDATE_TIMEOUT_MS,
      maxBuffer: 10 * 1024 * 1024,
    });
    const after = await imageId();

    const changed = before !== after;
    return {
      message: changed
        ? `Pulled new controller image ${image}. Recreate the container to use it.`
        : `Controller image ${image} is already up to date`,
      output: tail(`${stdout}\n${stderr}`),
    };
  }

  private async getControllerImage(): Promise<string> {
    if (process.env.CONTROLLER_IMAGE) return process.env.CONTROLLER_IMAGE;
    try {
      const { stdout } = await execFileAsync('sudo', [
        '-n', 'docker', 'inspect', '--format', '{{.Config.Image}}', CONTROLLER_CONTAINER,
      ]);
      const image = stdout.trim();
      if (image) return image;
    } catch {
      // fall through
    }
    throw new Error(
      `Could not determine controller image from container "${CONTROLLER_CONTAINER}". Set CONTROLLER_IMAGE.`
    );
  }

  /**
   * setup.sh stops and restarts this very service, so it must run outside this
   * service's cgroup (transient systemd unit) and from a copy of the script,
   * because the script overwrites its own directory.
   */
  private async updateApi() {
    const dir = DIRS.api;
    const scriptCopy = '/tmp/beatnik-api-update.sh';
    await fs.copyFile(path.join(dir, 'setup.sh'), scriptCopy);
    await fs.chmod(scriptCopy, 0o755);

    const isRoot = typeof process.getuid === 'function' && process.getuid() === 0;
    const unit = `beatnik-api-update-${Date.now()}`;
    const systemdRunArgs = [
      `--unit=${unit}`,
      '--collect',
      `--uid=${BEATNIK_USER}`,
      `--working-directory=${dir}`,
      `--setenv=HOME=${BEATNIK_HOME}`,
      'bash',
      scriptCopy,
    ];

    if (isRoot) {
      await execFileAsync('systemd-run', systemdRunArgs, { timeout: 30_000 });
    } else {
      await execFileAsync('sudo', ['-n', 'systemd-run', ...systemdRunArgs], { timeout: 30_000 });
    }
    return {
      message: 'Hardware API update started. The service will restart shortly.',
      output: `Running as systemd unit ${unit}. Follow with: journalctl -u ${unit}`,
    };
  }
}

export const updateService = new UpdateService();
