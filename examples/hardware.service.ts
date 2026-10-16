import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// Interfaces matching the API types
export interface HatProfile {
  id: string;
  name: string;
  overlay: string;
  eepromMatch?: string;
  camilla: {
    device: string;
    format: string;
    channels?: number;
  };
}

export interface HardwareStatus {
  currentConfig: HatProfile | null;
  detectedHardware: HatProfile | null;
  isMatch: boolean;
  eepromReadDisabled: boolean;
  camillaConfigFile: string;        // Active playback (default) CamillaDSP config
  preampConfigFile: string | null;  // Active line-in (preamp) config, null if no preamp is set up
}

export interface CamillaConfigList {
  configs: string[]; // e.g. ['flat.yml', 'loudness.yml']
}

export interface CamillaDefaultConfig {
  fileName: string;
}

export interface SetCamillaConfigResponse {
  status: string;
  fileName: string;
  camillaRestarted: boolean;
}

export interface ApplyResponse {
  status: string;
  message: string;
  rebootRequired: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class HardwareService {
  // TODO: Update this URL to point to your Raspberry Pi's IP address and port
  // e.g., 'http://192.168.1.100:3000/api/hardware'
  // Or use a proxy.conf.json in Angular to forward /api requests
  private apiUrl = 'http://localhost:3000/api/hardware';

  constructor(private http: HttpClient) {}

  /**
   * Get a list of all supported HATs
   */
  getHats(): Observable<HatProfile[]> {
    return this.http.get<HatProfile[]>(`${this.apiUrl}/hats`);
  }

  /**
   * Get the current system status (configured vs detected hardware)
   */
  getStatus(): Observable<HardwareStatus> {
    return this.http.get<HardwareStatus>(`${this.apiUrl}/status`);
  }

  /**
   * Apply a new hardware configuration
   * This will update config.txt and the playback CamillaDSP config
   */
  applyConfiguration(hatId: string): Observable<ApplyResponse> {
    return this.http.post<ApplyResponse>(`${this.apiUrl}/apply`, { hatId });
  }

  // ---------------------------------------------------------------------------
  // Playback (default CamillaDSP instance, ~/camilladsp/configs)
  // Output to the HAT / speakers. Switching the config also re-applies the
  // current HAT output settings and restarts the camilladsp service.
  // ---------------------------------------------------------------------------

  /**
   * List the available playback configs
   */
  getPlaybackConfigs(): Observable<CamillaConfigList> {
    return this.http.get<CamillaConfigList>(`${this.apiUrl}/camilla/configs`);
  }

  /**
   * Get the currently active playback config
   */
  getPlaybackDefaultConfig(): Observable<CamillaDefaultConfig> {
    return this.http.get<CamillaDefaultConfig>(`${this.apiUrl}/camilla/configs/default`);
  }

  /**
   * Set the active playback config (restarts CamillaDSP)
   */
  setPlaybackDefaultConfig(fileName: string): Observable<SetCamillaConfigResponse> {
    return this.http.put<SetCamillaConfigResponse>(`${this.apiUrl}/camilla/configs/default`, { fileName });
  }

  // ---------------------------------------------------------------------------
  // Line in (preamp CamillaDSP instance, ~/camilladsp/preamp)
  // Analog input (e.g. vinyl) processed by CamillaDSP and sent to Snapcast.
  // Optional: these calls fail with an error if no preamp is set up.
  // ---------------------------------------------------------------------------

  /**
   * List the available line-in (preamp) configs
   */
  getLineInConfigs(): Observable<CamillaConfigList> {
    return this.http.get<CamillaConfigList>(`${this.apiUrl}/camilla/preamp/configs`);
  }

  /**
   * Get the currently active line-in (preamp) config
   */
  getLineInDefaultConfig(): Observable<CamillaDefaultConfig> {
    return this.http.get<CamillaDefaultConfig>(`${this.apiUrl}/camilla/preamp/configs/default`);
  }

  /**
   * Set the active line-in (preamp) config (restarts the preamp CamillaDSP service)
   */
  setLineInDefaultConfig(fileName: string): Observable<SetCamillaConfigResponse> {
    return this.http.put<SetCamillaConfigResponse>(`${this.apiUrl}/camilla/preamp/configs/default`, { fileName });
  }

  /**
   * Trigger a system reboot
   */
  reboot(): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/reboot`, {});
  }
}
