// Background sync service
class BackgroundSyncService {
  private static instance: BackgroundSyncService;
  private db: IDBDatabase | null = null;
  private dbName = 'helpdesk-sync';
  private version = 1;

  static getInstance(): BackgroundSyncService {
    if (!BackgroundSyncService.instance) {
      BackgroundSyncService.instance = new BackgroundSyncService();
    }
    return BackgroundSyncService.instance;
  }

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = () => {
        const db = request.result;
        
        // Store pour les tickets en attente
        if (!db.objectStoreNames.contains('pending-tickets')) {
          const ticketStore = db.createObjectStore('pending-tickets', { keyPath: 'id', autoIncrement: true });
          ticketStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
        
        // Store pour les actions en attente
        if (!db.objectStoreNames.contains('pending-actions')) {
          const actionStore = db.createObjectStore('pending-actions', { keyPath: 'id', autoIncrement: true });
          actionStore.createIndex('type', 'type', { unique: false });
        }
        
        // Store pour le cache offline
        if (!db.objectStoreNames.contains('offline-cache')) {
          const cacheStore = db.createObjectStore('offline-cache', { keyPath: 'key' });
          cacheStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  async addPendingTicket(ticketData: any): Promise<void> {
    if (!this.db) await this.init();
    
    const transaction = this.db!.transaction(['pending-tickets'], 'readwrite');
    const store = transaction.objectStore('pending-tickets');
    
    const pendingTicket = {
      data: ticketData,
      timestamp: Date.now(),
      type: 'create-ticket'
    };
    
    await store.add(pendingTicket);
      // Enregistrer pour background sync
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await (registration as any).sync.register('ticket-sync');
      } catch (error) {
        console.log('Background sync not supported:', error);
      }
    }
  }

  async addPendingAction(action: any): Promise<void> {
    if (!this.db) await this.init();
    
    const transaction = this.db!.transaction(['pending-actions'], 'readwrite');
    const store = transaction.objectStore('pending-actions');
    
    const pendingAction = {
      ...action,
      timestamp: Date.now()
    };
    
    await store.add(pendingAction);
      // Enregistrer pour background sync
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await (registration as any).sync.register('action-sync');
      } catch (error) {
        console.log('Background sync not supported:', error);
      }
    }
  }

  async getPendingItems(storeName: string): Promise<any[]> {
    if (!this.db) await this.init();
    
    const transaction = this.db!.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async removePendingItem(storeName: string, id: number): Promise<void> {
    if (!this.db) await this.init();
    
    const transaction = this.db!.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    
    await store.delete(id);
  }

  async cacheForOffline(key: string, data: any): Promise<void> {
    if (!this.db) await this.init();
    
    const transaction = this.db!.transaction(['offline-cache'], 'readwrite');
    const store = transaction.objectStore('offline-cache');
    
    const cacheItem = {
      key,
      data,
      timestamp: Date.now()
    };
    
    await store.put(cacheItem);
  }

  async getFromOfflineCache(key: string): Promise<any> {
    if (!this.db) await this.init();
    
    const transaction = this.db!.transaction(['offline-cache'], 'readonly');
    const store = transaction.objectStore('offline-cache');
    
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result?.data);
      request.onerror = () => reject(request.error);
    });
  }

  async isOnline(): Promise<boolean> {
    return navigator.onLine;
  }

  async syncPendingData(): Promise<void> {
    if (!await this.isOnline()) return;

    try {
      // Sync pending tickets
      const pendingTickets = await this.getPendingItems('pending-tickets');
      for (const ticket of pendingTickets) {
        try {
          const response = await fetch('/api/tickets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ticket.data)
          });
          
          if (response.ok) {
            await this.removePendingItem('pending-tickets', ticket.id);
          }
        } catch (error) {
          console.error('Failed to sync ticket:', error);
        }
      }

      // Sync pending actions
      const pendingActions = await this.getPendingItems('pending-actions');
      for (const action of pendingActions) {
        try {
          const response = await fetch(action.url, {
            method: action.method || 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(action.data)
          });
          
          if (response.ok) {
            await this.removePendingItem('pending-actions', action.id);
          }
        } catch (error) {
          console.error('Failed to sync action:', error);
        }
      }
    } catch (error) {
      console.error('Background sync failed:', error);
    }
  }
}

export default BackgroundSyncService;
