import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import EventEmitter from 'events';
import path from 'path';

export class GpioService extends EventEmitter {
  private pythonProcess: ChildProcessWithoutNullStreams | null = null;

  constructor() {
    super();
    this.startProcess();
  }

  private startProcess() {
    const scriptPath = path.join(process.cwd(), 'src', 'scripts', 'gpio_handler.py');
    this.pythonProcess = spawn('python3', [scriptPath]);

    this.pythonProcess.stdout.on('data', (data) => {
      const lines = data.toString().split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const event = JSON.parse(line);
          this.emit('event', event);
          console.log('[GPIO] Event:', event);
        } catch (e) {
          console.error('[GPIO] Failed to parse stdout JSON:', line);
        }
      }
    });

    this.pythonProcess.stderr.on('data', (data) => {
      console.error(`[GPIO] Python stderr: ${data}`);
    });

    this.pythonProcess.on('close', (code) => {
      console.log(`[GPIO] Python process exited with code ${code}. Restarting in 5s...`);
      this.pythonProcess = null;
      setTimeout(() => this.startProcess(), 5000);
    });
  }

  private sendCommand(command: string, params: Record<string, any> = {}) {
    if (this.pythonProcess) {
      const payload = JSON.stringify({ command, params }) + '\n';
      this.pythonProcess.stdin.write(payload);
    } else {
      console.warn('[GPIO] Cannot send command, Python process is not running');
    }
  }

  setColor(r: number, g: number, b: number) {
    this.sendCommand('set_color', { r, g, b });
  }

  pulse(on_color: [number, number, number], off_color: [number, number, number], fade_in = 1, fade_out = 1) {
    this.sendCommand('pulse', { on_color, off_color, fade_in, fade_out });
  }

  blink(color: [number, number, number], on_time = 0.5, off_time = 0.5) {
    this.sendCommand('blink', { color, on_time, off_time });
  }

  turnOff() {
    this.sendCommand('off');
  }

  shutdown() {
    if (this.pythonProcess) {
      this.pythonProcess.kill();
      this.pythonProcess = null;
    }
  }
}

export const gpioService = new GpioService();
