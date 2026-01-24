import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SyncService {

  async triggerSync() {
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'REPLAY_OUTBOX'
    });
  }
}
}
