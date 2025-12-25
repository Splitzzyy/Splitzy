import { Injectable, inject } from '@angular/core';
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { SplitzService } from '../splitz/splitz.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const splitzService = inject(SplitzService);
  
  const token = splitzService.getToken();
  
  // Add Authorization header if token exists
  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      }
    });
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      console.log('Interceptor caught error:', error.status);
      if (error.status === 401) {
        console.log('401 error - logging out');
        splitzService.logout();
      }
      return throwError(() => error);
    })
  );
};
