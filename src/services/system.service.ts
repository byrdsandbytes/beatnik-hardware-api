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

/**
 * Helper to get IP addresses and MAC address of non-internal network interfaces
 */
function getNetworkInfo(): { ipAddresses: string[]; macAddress: string | null } {
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
  return { ipAddresses, macAddress };
}

/**
 * Helper to get storage space and type information
 */
async function getStorageInfo(): Promise<{ type: string | null; total: number; free: number }> {
  let type: string | null = null;
  let total = 0;
  let free = 0;

  try {
    // Linux/Raspberry Pi specific robust block sizing. 
    // %S = block size, %b = total blocks, %a = free blocks available to non-superuser
    const { stdout: statOut } = await execAsync('stat -f -c "%S %b %a" /');
    const parts = statOut.trim().split(/\\s+/);
    if (parts.length === 3) {
      const blockSize = parseInt(parts[0], 10);
      total = parseInt(parts[1], 10) * blockSize;
      free = parseInt(parts[2], 10) * blockSize;
    }
  } catch (e) {
    try {
      // Fallback for macOS/Unix using POSIX df -k (1024 byte blocks)
      const { stdout: dfOut } = await execAsync('df -k /');
      const lines = dfOut.trim().split('\\n');
      if (lines.length > 1) {
        // df will often wrap long device names to the next line.
        // The numeric data is guaranteed to be on the last line.
        const lastLine = lines[lines.length - 1];
        const parts = lastLine.trim().split(/\\s+/);
        // Counting from the end: [ ..., total_blocks, used, free, capacity, mount ]
        const freeIdx = parts.length - 3;
        const totalIdx = parts.length - 5;
        if (freeIdx >= 0 && totalIdx >= 0) {
          total = parseInt(parts[totalIdx], 10) * 1024;
          free = parseInt(parts[freeIdx], 10) * 1024;
        }
      }
    } catch (e2) {
      // Ignore
    }
  }

  try {
    const typeStr = await fs.readFile('/sys/class/block/mmcblk0/device/type', 'utf8');
    const name = await fs.readFile('/sys/class/block/mmcblk0/device/name', 'utf8');
    type = `${typeStr.trim()} (${name.trim()})`;
  } catch (e) {
    try {
      const model = await fs.readFile('/sys/class/block/nvme0n1/device/model', 'utf8');
      type = `NVMe (${model.trim()})`;
    } catch (e) {
      try {
        const { stdout: lsblkOut } = await execAsync('lsblk -d -o NAME,MODEL | grep -E "sda|nvme" | head -1');
        if (lsblkOut.trim()) {
          type = lsblkOut.trim().split(/\\s+/).slice(1).join(' ').trim() || 'Unknown';
        }
      } catch (e) {
        // Ignore lsblk errors
      }
    }
  }

  return { type, total, free };
}

/**
 * Helper to get the CPU temperature
 */
async function getTemperature(): Promise<number | null> {
  try {
    // Common path for CPU temp on Raspberry Pi
    const tempString = await fs.readFile('/sys/class/thermal/thermal_zone0/temp', 'utf8');
    return parseInt(tempString.trim(), 10) / 1000; // millidegrees to degrees
  } catch (e) {
    // Ignore if not running on supported hardware
    return null;
  }
}

export class SystemService {
  async getInfo(): Promise<SystemInfo> {
    const { ipAddresses, macAddress } = getNetworkInfo();
    const { type: storageType, total: storageTotal, free: storageFree } = await getStorageInfo();
    const temperature = await getTemperature();

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
