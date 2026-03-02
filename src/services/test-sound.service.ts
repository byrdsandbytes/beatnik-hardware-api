import { exec } from 'child_process';
import { promisify } from 'util';
import { ConfigService } from './config.service';

const execAsync = promisify(exec);

export class TestSoundService {
  private configService: ConfigService;

  constructor() {
    this.configService = new ConfigService();
  }

  async playTestSound() {
    console.log('Starting test sound sequence...');
    
    // 1. Audio-Dienste stoppen, um das Device freizugeben
    try {
      console.log('Stopping snapclient...');
      await execAsync('sudo systemctl stop snapclient');
    } catch (e) {
      console.warn('Warning: Failed to stop snapclient (maybe not running?). Continuing...', e);
    }

    try {
      console.log('Stopping camilladsp...');
      await execAsync('sudo systemctl stop camilladsp');
    } catch (e) {
      console.warn('Warning: Failed to stop camilladsp (maybe not running?). Continuing...', e);
    }

    // 2. Testton abspielen
    let playedDevice = '';
    try {
      const config = await this.configService.getActiveConfig();

      if (!config || !config.camilla?.device) {
        throw new Error('No active audio configuration found. Please configure a HAT first.');
      }

      playedDevice = config.camilla.device;
      console.log(`Playing test sound on device: ${playedDevice}`);

      // speaker-test Parameter:
      // -D device: ALSA Device (z.B. plughw:CARD=...,DEV=0)
      // -c 2: 2 Kanäle (Stereo)
      // -t wav: Spielt "Front Left" / "Front Right" Stimmen
      // -l 1: Nur ein Durchlauf
      await execAsync(`speaker-test -D ${playedDevice} -c 2 -t wav -l 1`);
      
      console.log('Test sound finished successfully.');
      return { success: true, device: playedDevice };

    } catch (error: any) {
      console.error('Test sound failed:', error);
      throw new Error(`Test sound execution failed: ${error.message}`);
    } finally {
      // 3. Dienste wiederherstellen (wichtig!)
      console.log('Restoring audio services...');
      
      try {
        await execAsync('sudo systemctl start camilladsp');
        console.log('camilladsp restarted.');
      } catch (e) {
        console.error('CRITICAL: Failed to restart camilladsp:', e);
      }

      try {
        await execAsync('sudo systemctl start snapclient');
        console.log('snapclient restarted.');
      } catch (e) {
        console.error('CRITICAL: Failed to restart snapclient:', e);
      }
    }
  }
}
