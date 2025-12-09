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
   * This will update config.txt and camilladsp.yml
   */
  applyConfiguration(hatId: string): Observable<ApplyResponse> {
    return this.http.post<ApplyResponse>(`${this.apiUrl}/apply`, { hatId });
  }

  /**
   * Trigger a system reboot
   */
  reboot(): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/reboot`, {});
  }
}
