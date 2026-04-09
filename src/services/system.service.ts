import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';

const execAsync = promisify(exec);

export interface SystemInfo {
  hostname: string;
  ipAddresses: string[];
  totalRam: number;
  freeRam: number;
  temperature: number | null;
}

export class SystemService {
  async getInfo(): Promise<SystemInfo> {
    const interfaces = os.networkInterfaces();
    const ipAddresses: string[] = [];
    
    for (const name of Object.keys(interfaces)) {
      for (const net of interfaces[name] || []) {
        if (!net.internal && net.family === 'IPv4') {
          ipAddresses.push(net.address);
        }
      }
    }

    let temperature: number | null = null;
    try {
      // Common path for CPU temp on Raspberry Pi
      const tempString = await fs.readFile('/sys/class/thermal/thermal_zone0/temp', 'utf8');
      temperature = parseInt(tempString.trim(), 10) / 1000; // millidegrees to degrees
    } catch (e) {
      // Ignore if not running on supported hardware
    }

    return {
      hostname: os.hostname(),
      ipAddresses,
      totalRam: os.totalmem(),
      freeRam: os.freemem(),
      temperature,
    };
  }

  async reboot(): Promise<void> {
    await execAsync('sudo reboot');
  }
}

export const systemService = new SystemService();
