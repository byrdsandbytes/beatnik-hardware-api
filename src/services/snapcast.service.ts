import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class SnapcastService {
  /**
   * Checks if the snapserver service is active (running) and enabled (starts on boot)
   */
  async getStatus(): Promise<{ enabled: boolean; active: boolean }> {
    let active = false;
    let enabled = false;

    try {
      // Check if active (running)
      try {
        await execAsync('systemctl is-active snapserver');
        active = true;
      } catch (e) {
        // Exit code non-zero means inactive
        active = false;
      }

      // Check if enabled (starts on boot)
      try {
        await execAsync('systemctl is-enabled snapserver');
        enabled = true;
      } catch (e) {
        // Exit code non-zero means disabled
        enabled = false;
      }

      return { active, enabled };
    } catch (error) {
      console.error('Error checking snapserver status:', error);
      throw new Error('Failed to check snapserver status');
    }
  }

  /**
   * Enables the snapserver service to start on boot and starts it strictly now
   */
  async enable(): Promise<void> {
    try {
      await execAsync('sudo systemctl enable --now snapserver');
    } catch (error) {
      console.error('Error enabling snapserver:', error);
      throw new Error('Failed to enable snapserver');
    }
  }

  /**
   * Disables the snapserver service from starting on boot and stops it immediately
   * Also restarts the snapclient so it can immediately search for another server
   */
  async disable(): Promise<void> {
    try {
      await execAsync('sudo systemctl disable --now snapserver');
      await execAsync('sudo systemctl restart snapclient');
    } catch (error) {
      console.error('Error disabling snapserver or restarting snapclient:', error);
      throw new Error('Failed to disable snapserver');
    }
  }
}

export const snapcastService = new SnapcastService();
