import { Bonjour } from 'bonjour-service';
import os from 'os';

export class MdnsService {
  private bonjour: Bonjour;
  private service: any;

  constructor() {
    this.bonjour = new Bonjour();
  }

  /**
   * Start advertising the service via mDNS
   */
  async start(): Promise<void> {
    const hostname = os.hostname();
    console.log(`Starting mDNS advertisement for _beatnik._tcp on port 3000 (Host: ${hostname})`);

    this.service = this.bonjour.publish({
      name: `Beatnik Hardware API - ${hostname}`,
      type: 'beatnik',
      port: 3000,
      protocol: 'tcp',
      txt: {
        version: '0.4.0'
      }
    });

    this.service.on('error', (error: Error) => {
      console.error('mDNS advertisement error:', error);
    });
  }

  /**
   * Stop advertising the service
   */
  async stop(): Promise<void> {
    if (this.service) {
      console.log('Stopping mDNS advertisement...');
      return new Promise((resolve) => {
        this.service.stop(() => {
          console.log('mDNS advertisement stopped');
          this.bonjour.destroy();
          resolve();
        });
      });
    }
  }
}

export const mdnsService = new MdnsService();
