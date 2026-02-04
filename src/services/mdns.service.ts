import ciao, { CiaoService } from '@homebridge/ciao';
import os from 'os';
import path from 'path';
import fs from 'fs';

// Helper to read package.json
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf-8'));

export class MdnsService {
    private service: CiaoService | null = null;

    /**
     * Start advertising the service via mDNS using ciao
     * ciao automatically handles interface binding and robust network advertising
     */
    async start(): Promise<void> {
        const hostname = os.hostname();
        const version = packageJson.version;
        
        console.log(`Starting mDNS advertisement: _beatnik._tcp, Port: 3000, Host: ${hostname}, v${version}`);

        const responder = ciao.getResponder();
        
        this.service = responder.createService({
            name: `Beatnik Hardware API - ${hostname}`,
            type: 'beatnik', // ciao automatically expands this to _beatnik._tcp
            port: 3000,
            txt: {
                version
            }
        });

        await this.service.advertise();
        console.log('mDNS service published successfully');
    }

    /**
     * Stop advertising the service
     */
    async stop(): Promise<void> {
        if (this.service) {
            console.log('Stopping mDNS advertisement...');
            await this.service.end();
            console.log('mDNS advertisement stopped');
            this.service = null;
        }
    }
}

export const mdnsService = new MdnsService();
