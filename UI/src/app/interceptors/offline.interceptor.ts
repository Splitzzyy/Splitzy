import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { OfflineDbService } from '../splitz/services/offline-db.service';
import { from, EMPTY } from 'rxjs';

export const offlineInterceptor: HttpInterceptorFn = (req, next) => {

  if (req.method === 'GET' || navigator.onLine) {
    return next(req);
  }

  const db = inject(OfflineDbService);

  const headers: Record<string, string> = {};
  req.headers.keys().forEach(key => {
    const value = req.headers.get(key);
    if (value !== null) {
      headers[key] = value;
    }
  });

  const offlineRequest = {
    id: crypto.randomUUID(),
    url: req.url,
    method: req.method,
    body: req.body,
    headers,
    timestamp: Date.now()
  };

  return from(db.addRequest(offlineRequest)).pipe(() => EMPTY);
};

