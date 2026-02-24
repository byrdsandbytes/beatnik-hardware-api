import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

// Configurable constants
const AVAHI_SERVICE_DIR = process.env.AVAHI_SERVICE_DIR || '/etc/avahi/services';
const SERVICE_FILENAME = 'beatnik-hardware.service';

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
    console.log(`Starting mDNS advertisement for _beatnik._tcp on port 3000 (Host: ${hostname})`);
    
    // Create the service definition XML
    // Note: %h in the name is replaced by avahi-daemon with the hostname
    const serviceXml = `<?xml version="1.0" standalone='no'?><!--*-nxml-*-->
<!DOCTYPE service-group SYSTEM "avahi-service.dtd">
<service-group>
  <name replace-wildcards="yes">Beatnik Hardware API - %h</name>
  <service>
    <type>_beatnik._tcp</type>
    <port>3000</port>
    <txt-record>version=0.4.0</txt-record>
  </service>
</service-group>
`;

    try {
      // Write the service file
      await fs.writeFile(this.serviceFilePath, serviceXml, 'utf8');
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

