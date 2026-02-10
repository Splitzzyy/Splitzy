import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';

export interface ApiStatus {
  isAvailable: boolean;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApiAvailabilityService {
  private apiStatusSubject = new BehaviorSubject<ApiStatus>({ isAvailable: true });
  public apiStatus$ = this.apiStatusSubject.asObservable();

  // APIs to exclude from unavailability check
  private excludedEndpoints = [
    environment.endpoints.LOGIN,
    environment.endpoints.LOGOUT,
    environment.endpoints.REFRESH,
    environment.endpoints.REGISTER,
    environment.endpoints.FORGOTPASS,
    environment.endpoints.SETUPPASS,
    environment.endpoints.VERIFY_EMAIL,
    environment.endpoints.RESEND_VERIFICATION,
    environment.endpoints.GOOGLELOGIN,
  ];

  constructor(private http: HttpClient) {}

  /**
   * Check if an endpoint is excluded from unavailability handling
   */
  isExcludedEndpoint(url: string): boolean {
    return this.excludedEndpoints.some(endpoint => url.includes(endpoint));
  }

  /**
   * Set API availability status
   */
  setApiUnavailable(error: string): void {
    this.apiStatusSubject.next({
      isAvailable: false,
      error
    });
  }

  /**
   * Set API availability to available
   */
  setApiAvailable(): void {
    this.apiStatusSubject.next({
      isAvailable: true
    });
  }

  /**
   * Get current API status
   */
  isApiAvailable(): boolean {
    return this.apiStatusSubject.value.isAvailable;
  }

  /**
   * Get current API status as observable
   */
  getApiStatus(): Observable<ApiStatus> {
    return this.apiStatus$;
  }
}
