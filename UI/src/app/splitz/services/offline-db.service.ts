import { Injectable } from '@angular/core';
import { openDB, DBSchema } from 'idb';

interface OfflineDB extends DBSchema {
  outbox: {
    key: string;
    value: {
      id: string;
      url: string;
      method: string;
      body: any;
      headers: any;
      timestamp: number;
    };
  };
}

@Injectable({ providedIn: 'root' })
export class OfflineDbService {
  private dbPromise = openDB<OfflineDB>('offline-db', 1, {
    upgrade(db) {
      db.createObjectStore('outbox', { keyPath: 'id' });
    }
  });

  async addRequest(data: OfflineDB['outbox']['value']) {
    const db = await this.dbPromise;
    return db.put('outbox', data);
  }

  async getAllRequests() {
    const db = await this.dbPromise;
    return db.getAll('outbox');
  }

  async deleteRequest(id: string) {
    const db = await this.dbPromise;
    return db.delete('outbox', id);
  }
}
