import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { SplitzService } from '../splitz/splitz.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const splitzService = inject(SplitzService);
  const token = splitzService.getToken();
  let headers: { [key: string]: string } = {};
  if (!(req.body instanceof FormData) && !req.headers.has('Content-Type')) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (Object.keys(headers).length > 0) {
    req = req.clone({ setHeaders: headers });
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
