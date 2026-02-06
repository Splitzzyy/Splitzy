import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { timeout, catchError, throwError } from 'rxjs';
import { inject } from '@angular/core';
import { ApiAvailabilityService } from '../splitz/services/api-availability.service';

// 30 second timeout for API requests
const REQUEST_TIMEOUT = 10000;

export const timeoutInterceptor: HttpInterceptorFn = (req, next) => {
  const apiAvailabilityService = inject(ApiAvailabilityService);

  return next(req).pipe(
    timeout(REQUEST_TIMEOUT),
    catchError((error: any) => {
      // Handle timeout errors
      if (error.name === 'TimeoutError') {
        console.error(`Request timeout for endpoint: ${req.url}`);
        
        // Don't show service unavailable for excluded endpoints
        if (!apiAvailabilityService.isExcludedEndpoint(req.url)) {
          apiAvailabilityService.setApiUnavailable('Request timed out. The server is not responding.');
        }
      }
      return throwError(() => error);
    })
  );
};
