import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { systemService } from './system.service';

// Configurable constants
const AVAHI_SERVICE_DIR = process.env.AVAHI_SERVICE_DIR || '/etc/avahi/services';
const SERVICE_FILENAME = 'beatnik-hardware.service';

/**
 * Helper to get app version from package.json
 */
async function getAppVersion(): Promise<string> {
  try {
    const pkgPath = path.join(process.cwd(), 'package.json');
    const pkgContent = await fs.readFile(pkgPath, 'utf8');
    return JSON.parse(pkgContent).version || 'unknown';
  } catch (e) {
    return 'unknown';
  }
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
    const sysInfo = await systemService.getInfo();
    const mac = sysInfo.macAddress || '00:00:00:00:00:00';
    const model = sysInfo.model;
    const totalRam = os.totalmem();
    const gb = totalRam / (1024 * 1024 * 1024);
    const ram = `${gb.toFixed(1)}GB`;
    const version = await getAppVersion();

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

