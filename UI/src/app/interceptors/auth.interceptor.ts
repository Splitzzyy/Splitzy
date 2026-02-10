import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { throwError, catchError, switchMap, take } from 'rxjs';
import { TokenRefreshService } from '../splitz/services/token-refresh.service';
import { TokenStorageService } from '../splitz/services/token-storage.service';
import { SplitzService } from '../splitz/services/splitz.service';
import { ApiAvailabilityService } from '../splitz/services/api-availability.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenStorageService = inject(TokenStorageService);
  const tokenRefreshService = inject(TokenRefreshService);
  const splitzService = inject(SplitzService);
  const apiAvailabilityService = inject(ApiAvailabilityService);
  
  const token = tokenStorageService.getToken();
  let headers: { [key: string]: string } = {};

  if (!(req.body instanceof FormData) && !req.headers.has('Content-Type')) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (Object.keys(headers).length > 0) {
    req = req.clone({ setHeaders: headers, withCredentials: true });
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Handle 5xx errors (Service Unavailable, etc.) - except for excluded endpoints
      if (error.status >= 500 && !apiAvailabilityService.isExcludedEndpoint(req.url)) {
        console.error(`Server error ${error.status} for endpoint: ${req.url}`);
        const errorMessage = error.error?.message || `Server error: ${error.status} ${error.statusText}`;
        apiAvailabilityService.setApiUnavailable(errorMessage);
        return throwError(() => error);
      }

      // Handle 401 Unauthorized responses
      if (error.status === 401 && !req.url.includes('/logout') && !req.url.includes('/refresh')) {
        console.log('Received 401 Unauthorized, attempting token refresh...');
        
        // Try to refresh the token
        return tokenRefreshService.refreshTokenManually().pipe(
          switchMap(response => {
            if (response.accessToken) {
              // Update token in storage
              tokenStorageService.setToken(response.accessToken);
              console.log('Token refreshed successfully, retrying original request...');
              
              // Retry the original request with new token
              let retryReq = req.clone({
                setHeaders: {
                  Authorization: `Bearer ${response.accessToken}`,
                },
                withCredentials: true
              });
              
              return next(retryReq);
            }
            
            return throwError(() => error);
          }),
          catchError(refreshError => {
            console.error('Token refresh failed, logout triggered');
            splitzService.logout();
            return throwError(() => refreshError);
          }),
        );
      }

      return throwError(() => error);
    })
  );
};