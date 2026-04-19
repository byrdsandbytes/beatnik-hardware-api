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
  os: string;
  macAddress: string | null;
  storageType: string | null;
  storageTotal: number;
  storageFree: number;
}

export class SystemService {
  async getInfo(): Promise<SystemInfo> {
    const interfaces = os.networkInterfaces();
    const ipAddresses: string[] = [];
    let macAddress: string | null = null;
    
    for (const name of Object.keys(interfaces)) {
      for (const net of interfaces[name] || []) {
        if (!net.internal && net.family === 'IPv4') {
          ipAddresses.push(net.address);
          if (!macAddress && net.mac && net.mac !== '00:00:00:00:00:00') {
            macAddress = net.mac;
          }
        }
      }
    }

    let storageType: string | null = null;
    let storageTotal = 0;
    let storageFree = 0;

    try {
      const { stdout: dfOut } = await execAsync('df -B1 /');
      const lines = dfOut.split('\\n');
      if (lines.length > 1) {
        const parts = lines[1].trim().split(/\\s+/);
        storageTotal = parseInt(parts[1], 10);
        storageFree = parseInt(parts[3], 10);
      }

      try {
        const type = await fs.readFile('/sys/class/block/mmcblk0/device/type', 'utf8');
        const name = await fs.readFile('/sys/class/block/mmcblk0/device/name', 'utf8');
        storageType = `${type.trim()} (${name.trim()})`;
      } catch (e) {
        try {
          const model = await fs.readFile('/sys/class/block/nvme0n1/device/model', 'utf8');
          storageType = `NVMe (${model.trim()})`;
        } catch (e) {
          const { stdout: lsblkOut } = await execAsync('lsblk -d -o NAME,MODEL | grep -E "sda|nvme" | head -1');
          if (lsblkOut.trim()) {
            storageType = lsblkOut.trim().split(/\\s+/).slice(1).join(' ').trim() || 'Unknown';
          }
        }
      }
    } catch (e) {
      // Ignore storage errors on unsupported platforms
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
      os: `${os.type()} ${os.release()}`,
      macAddress,
      storageType,
      storageTotal,
      storageFree,
    };
  }

  async reboot(): Promise<void> {
    await execAsync('sudo reboot');
  }
}

export const systemService = new SystemService();
