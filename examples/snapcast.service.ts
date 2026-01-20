import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface SnapcastStatus {
  active: boolean;  // Is the service currently running (systemctl is-active)
  enabled: boolean; // Is the service set to start on boot (systemctl is-enabled)
}

export interface SnapcastActionResponse extends SnapcastStatus {
  success: boolean;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class SnapcastService {
  // TODO: Update this URL to point to your Raspberry Pi's IP address and port
  // e.g., 'http://192.168.1.100:3000/api/snapcast'
  // Or use a proxy.conf.json in Angular to forward /api requests
  private apiUrl = 'http://localhost:3000/api/snapcast';

  constructor(private http: HttpClient) {}

  /**
   * Check if Snapserver is running and enabled
   */
  getStatus(): Observable<SnapcastStatus> {
    return this.http.get<SnapcastStatus>(`${this.apiUrl}/status`);
  }

  /**
   * Enable Snapserver (starts immediately and enables on boot)
   */
  enable(): Observable<SnapcastActionResponse> {
    return this.http.post<SnapcastActionResponse>(`${this.apiUrl}/enable`, {});
  }

  /**
   * Disable Snapserver (stops immediately and disables on boot)
   */
  disable(): Observable<SnapcastActionResponse> {
    return this.http.post<SnapcastActionResponse>(`${this.apiUrl}/disable`, {});
  }
}
