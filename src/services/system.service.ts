import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';

const execAsync = promisify(exec);

export interface SystemInfo {
  hostname: string;
  ipAddresses: string[];
  totalRam: string;
  freeRam: string;
  temperature: number | null;
  os: string;
  macAddress: string | null;
  storageType: string | null;
  model: string;
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
async function getStorageInfo(): Promise<string | null> {
  let type: string | null = null;

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

  return type;
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

/**
 * Helper to get Raspberry Pi model information
 */
async function getPiModel(): Promise<string> {
  try {
    // Try to read device tree model (standard on Pi)
    const modelPath = '/proc/device-tree/model';
    const content = await fs.readFile(modelPath, 'utf8');
    // Remove null terminator
    return content.replace(/\\0/g, '').trim();
  } catch (e) {
    // Ignore errors
  }
  return 'Unknown Device';
}

/**
 * Helper to get OS name from /etc/os-release
 */
async function getOsInfo(): Promise<string> {
  try {
    const osRelease = await fs.readFile('/etc/os-release', 'utf8');
    const match = osRelease.match(/^PRETTY_NAME="(.*)"$/m);
    if (match && match[1]) {
      return match[1];
    }
  } catch (e) {
    // Ignore errors and fall back to Node.js os module
  }
  return `${os.type()} ${os.release()}`;
}

/**
 * Helper to format RAM in GB
 */
function formatRam(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  return `${gb.toFixed(1)}GB`;
}

export class SystemService {
  async getInfo(): Promise<SystemInfo> {
    const { ipAddresses, macAddress } = getNetworkInfo();
    const storageType = await getStorageInfo();
    const temperature = await getTemperature();
    const model = await getPiModel();
    const osInfo = await getOsInfo();

    return {
      hostname: os.hostname(),
      ipAddresses,
      totalRam: formatRam(os.totalmem()),
      freeRam: formatRam(os.freemem()),
      temperature,
      os: osInfo,
      macAddress,
      storageType,
      model,
    };
  }

  async reboot(): Promise<void> {
    await execAsync('sudo reboot');
  }
}

export const systemService = new SystemService();
