import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CamillaConfigList {
  configs: string[]; // e.g. ['stereo-default.yaml', 'stereo-3-band-eq.yaml']
}

export interface CamillaDefaultConfig {
  fileName: string;
}

export interface SetCamillaConfigResponse {
  status: string;
  fileName: string;
  camillaRestarted: boolean;
}

/**
 * Two CamillaDSP instances are managed by the hardware API:
 *  - 'playback': camilladsp.service, configs in <CAMILLA_HOME>/configs (Snapcast -> HAT)
 *  - 'preamp':   camilladsp-preamp.service, configs in <CAMILLA_HOME>/preamp (line-in -> Snapcast)
 * Setting a config re-points the active client_config.yml symlink and restarts that instance's service.
 */
export type CamillaInstance = 'playback' | 'preamp';

@Injectable({
  providedIn: 'root'
})
export class CamillaService {
  // TODO: Update this URL to point to your Raspberry Pi's IP address and port
  // e.g., 'http://192.168.1.100:3000/api/hardware/camilla'
  private apiUrl = 'http://localhost:3000/api/hardware/camilla';

  constructor(private http: HttpClient) {}

  private base(instance: CamillaInstance): string {
    return instance === 'preamp' ? `${this.apiUrl}/preamp/configs` : `${this.apiUrl}/configs`;
  }

  /** List the available configs of an instance */
  getConfigs(instance: CamillaInstance): Observable<CamillaConfigList> {
    return this.http.get<CamillaConfigList>(this.base(instance));
  }

  /** Get the active config of an instance */
  getActiveConfig(instance: CamillaInstance): Observable<CamillaDefaultConfig> {
    return this.http.get<CamillaDefaultConfig>(`${this.base(instance)}/default`);
  }

  /** Set the active config and restart the instance's systemd service */
  setActiveConfig(instance: CamillaInstance, fileName: string): Observable<SetCamillaConfigResponse> {
    return this.http.put<SetCamillaConfigResponse>(`${this.base(instance)}/default`, { fileName });
  }
}

// ---------------------------------------------------------------------------
// Usage in a component
// ---------------------------------------------------------------------------
//
// constructor(private camilla: CamillaService) {}
//
// ngOnInit() {
//   this.camilla.getConfigs('playback').subscribe(r => (this.playbackConfigs = r.configs));
//   this.camilla.getActiveConfig('playback').subscribe(r => (this.playbackActive = r.fileName));
//
//   this.camilla.getConfigs('preamp').subscribe(r => (this.preampConfigs = r.configs));
//   this.camilla.getActiveConfig('preamp').subscribe(r => (this.preampActive = r.fileName));
// }
//
// selectPreamp(fileName: string) {
//   this.camilla.setActiveConfig('preamp', fileName).subscribe({
//     next: r => (this.preampActive = r.fileName),
//     // 400 with { error } when the config is invalid or the service cannot be restarted
//     error: e => console.error(e.error?.error ?? 'Failed to set preamp config')
//   });
// }
