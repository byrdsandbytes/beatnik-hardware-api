import { Bonjour } from 'bonjour-service';
import os from 'os';
import path from 'path';
import fs from 'fs';

// Helper to read package.json
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf-8'));

export class MdnsService {
    private bonjour: Bonjour;
    private service: any;

    constructor() {
        this.bonjour = new Bonjour();
    }

    /**
     * Get the MAC address of the first non-internal network interface
     */
    private getMacAddress(): string {
        const interfaces = os.networkInterfaces();
        for (const name of Object.keys(interfaces)) {
            const iface = interfaces[name];
            // Skip internal (loopback) interfaces
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
     * Start advertising the service via mDNS
     */
    async start(): Promise<void> {
        const hostname = os.hostname();
        const mac = this.getMacAddress();
        const version = packageJson.version;

        console.log(`Starting mDNS advertisement: _beatnik._tcp, Port: 3000, Host: ${hostname}, MAC: ${mac}, v${version}`);

        this.service = this.bonjour.publish({
            host: hostname,
            name: `Beatnik Hardware API - ${hostname}`,
            type: 'beatnik',
            port: 3000,
            protocol: 'tcp',
            txt: {
                version,
                mac
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
