import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

// Configurable constants
const AVAHI_SERVICE_DIR = process.env.AVAHI_SERVICE_DIR || '/etc/avahi/services';
const SERVICE_FILENAME = 'beatnik-hardware.service';

/**
 * Helper to get the MAC address of the first non-internal network interface
 */
function getMacAddress(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    const iface = interfaces[name];
    if (!iface) continue;
    
    for (const alias of iface) {
      if (!alias.internal && alias.mac !== '00:00:00:00:00:00') {
        return alias.mac;
      }
    }
  }
  return '00:00:00:00:00:00';
}

/**
 * Helper to get Raspberry Pi model information
 */
async function getPiModel(): Promise<string> {
  try {
    // Try to read device tree model (standard on Pi)
    const modelPath = '/proc/device-tree/model';
    // Use fs.readFile (async) instead of readFileSync
    const content = await fs.readFile(modelPath, 'utf8');
    // Remove null terminator
    return content.replace(/\0/g, '').trim();
  } catch (e) {
    // Ignore errors
  }
  return 'Unknown Device';
}

/**
 * Helper to get total RAM in GB
 */
function getRamSize(): string {
  const totalMem = os.totalmem();
  const gb = totalMem / (1024 * 1024 * 1024);
  return `${gb.toFixed(1)}GB`;
}

export class MdnsService {
  private serviceFilePath: string;
  private isRunning: boolean = false;

  constructor() {
    this.serviceFilePath = path.join(AVAHI_SERVICE_DIR, SERVICE_FILENAME);
  }

  /**
   * Start advertising the service via mDNS using native Avahi files
   */
  async start(): Promise<void> {
    if (this.isRunning) return;
    
    const hostname = os.hostname();
    const mac = getMacAddress();
    const model = await getPiModel();
    const ram = getRamSize();
    const version = "0.4.0"; // Hardcoded for now, or read from package.json if imported

    console.log(`Starting mDNS advertisement for _beatnik._tcp on port 3000`);
    console.log(`Host: ${hostname}, MAC: ${mac}, Model: ${model}, RAM: ${ram}, v${version}`);
    
    // Create the service definition XML
    // Note: %h in the name is replaced by avahi-daemon with the hostname
    const list = [
      `<?xml version="1.0" standalone='no'?><!--*-nxml-*-->`,
      `<!DOCTYPE service-group SYSTEM "avahi-service.dtd">`,
      `<service-group>`,
      `  <name replace-wildcards="yes">Beatnik Hardware API - %h</name>`,
      `  <service>`,
      `    <type>_beatnik._tcp</type>`,
      `    <port>3000</port>`,
      `    <txt-record>version=${version}</txt-record>`,
      `    <txt-record>mac=${mac}</txt-record>`,
      `    <txt-record>model=${model}</txt-record>`,
      `    <txt-record>ram=${ram}</txt-record>`,
      `  </service>`,
      `</service-group>`
    ].join('\n');

    try {
      // Write the service file
      await fs.writeFile(this.serviceFilePath, list, 'utf8');
      console.log(`Service definition written to ${this.serviceFilePath}`);
      this.isRunning = true;
    } catch (error: any) {
      console.error(`Error writing Avahi service file to ${this.serviceFilePath}:`, error.message);
      if (error.code === 'EACCES') {
        console.error('Make sure the application has write permissions to the Avahi services directory.');
      }
    }
  }

  /**
   * Stop advertising the service by removing the service file
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return;

    console.log('Stopping mDNS advertisement...');
    try {
      await fs.unlink(this.serviceFilePath);
      console.log(`Service definition removed from ${this.serviceFilePath}`);
      this.isRunning = false;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, treat as success
        this.isRunning = false;
        return;
      }
      console.error(`Error removing Avahi service file ${this.serviceFilePath}:`, error.message);
    }
  }
}

export const mdnsService = new MdnsService();

