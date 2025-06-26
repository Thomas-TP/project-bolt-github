/**
 * Service de synchronisation périodique en arrière-plan
 * Utilise l'API Periodic Background Sync pour maintenir les données à jour
 */

export interface PeriodicSyncConfig {
  tag: string;
  minInterval: number; // en millisecondes
}

export class PeriodicBackgroundSyncService {
  private static instance: PeriodicBackgroundSyncService;
  private registrations: Map<string, PeriodicSyncConfig> = new Map();

  public static getInstance(): PeriodicBackgroundSyncService {
    if (!PeriodicBackgroundSyncService.instance) {
      PeriodicBackgroundSyncService.instance = new PeriodicBackgroundSyncService();
    }
    return PeriodicBackgroundSyncService.instance;
  }

  /**
   * Enregistre une synchronisation périodique
   */
  async registerPeriodicSync(config: PeriodicSyncConfig): Promise<boolean> {
    try {
      if (!('serviceWorker' in navigator) || !('periodicSync' in window.ServiceWorkerRegistration.prototype)) {
        console.warn('Periodic Background Sync not supported');
        return false;
      }

      const registration = await navigator.serviceWorker.ready;
      
      // Vérifier les permissions
      const status = await navigator.permissions.query({ name: 'periodic-background-sync' as any });
      if (status.state !== 'granted') {
        console.warn('Periodic Background Sync permission not granted');
        return false;
      }

      // Enregistrer la synchronisation périodique
      await (registration as any).periodicSync.register(config.tag, {
        minInterval: config.minInterval
      });

      this.registrations.set(config.tag, config);
      console.log(`Periodic sync registered: ${config.tag}`);
      return true;
    } catch (error) {
      console.error('Failed to register periodic sync:', error);
      return false;
    }
  }

  /**
   * Désactive une synchronisation périodique
   */
  async unregisterPeriodicSync(tag: string): Promise<boolean> {
    try {
      if (!('serviceWorker' in navigator) || !('periodicSync' in window.ServiceWorkerRegistration.prototype)) {
        return false;
      }

      const registration = await navigator.serviceWorker.ready;
      await (registration as any).periodicSync.unregister(tag);
      
      this.registrations.delete(tag);
      console.log(`Periodic sync unregistered: ${tag}`);
      return true;
    } catch (error) {
      console.error('Failed to unregister periodic sync:', error);
      return false;
    }
  }

  /**
   * Obtient la liste des synchronisations actives
   */
  async getRegistrations(): Promise<string[]> {
    try {
      if (!('serviceWorker' in navigator) || !('periodicSync' in window.ServiceWorkerRegistration.prototype)) {
        return [];
      }

      const registration = await navigator.serviceWorker.ready;
      const tags = await (registration as any).periodicSync.getTags();
      return tags;
    } catch (error) {
      console.error('Failed to get periodic sync registrations:', error);
      return [];
    }
  }
  /**
   * Configure les synchronisations par défaut pour l'application
   */
  async setupDefaultSyncs(): Promise<void> {
    try {
      if (!this.isSupported()) {
        console.log('Periodic sync not supported, skipping setup');
        return;
      }

      // Synchronisation des tickets toutes les 30 minutes
      await this.registerPeriodicSync({
        tag: 'sync-tickets',
        minInterval: 30 * 60 * 1000 // 30 minutes
      });

      // Synchronisation des notifications toutes les heures
      await this.registerPeriodicSync({
        tag: 'sync-notifications',
        minInterval: 60 * 60 * 1000 // 1 heure
      });

      // Synchronisation du statut utilisateur toutes les 15 minutes
      await this.registerPeriodicSync({
        tag: 'sync-user-status',
        minInterval: 15 * 60 * 1000 // 15 minutes
      });
    } catch (error) {
      console.error('Failed to setup default periodic syncs:', error);
    }
  }
  /**
   * Vérifie si l'API est supportée
   */
  isSupported(): boolean {
    try {
      return 'serviceWorker' in navigator && 
             'periodicSync' in window.ServiceWorkerRegistration.prototype;
    } catch (error) {
      console.warn('Error checking periodic sync support:', error);
      return false;
    }
  }

  /**
   * Demande les permissions nécessaires
   */
  async requestPermissions(): Promise<boolean> {
    try {
      if (!this.isSupported()) {
        return false;
      }

      const status = await navigator.permissions.query({ name: 'periodic-background-sync' as any });
      return status.state === 'granted';
    } catch (error) {
      console.error('Failed to check periodic sync permissions:', error);
      return false;
    }
  }
}

// Gestionnaire des événements du service worker pour la synchronisation périodique
export const handlePeriodicSync = async (event: any) => {
  console.log('Periodic sync event:', event.tag);
  
  switch (event.tag) {
    case 'sync-tickets':
      // Synchroniser les tickets
      await syncTicketsData();
      break;
    case 'sync-notifications':
      // Synchroniser les notifications
      await syncNotificationsData();
      break;
    case 'sync-user-status':
      // Synchroniser le statut utilisateur
      await syncUserStatusData();
      break;
    default:
      console.log('Unknown periodic sync tag:', event.tag);
  }
};

// Fonctions de synchronisation des données
const syncTicketsData = async () => {
  try {
    // Récupérer les derniers tickets depuis l'API
    const response = await fetch('/api/tickets/sync', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      // Stocker les données dans IndexedDB ou localStorage
      localStorage.setItem('tickets_sync_data', JSON.stringify({
        data,
        timestamp: Date.now()
      }));
      console.log('Tickets data synced successfully');
    }
  } catch (error) {
    console.error('Failed to sync tickets data:', error);
  }
};

const syncNotificationsData = async () => {
  try {
    // Synchroniser les notifications
    const response = await fetch('/api/notifications/sync', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      localStorage.setItem('notifications_sync_data', JSON.stringify({
        data,
        timestamp: Date.now()
      }));
      console.log('Notifications data synced successfully');
    }
  } catch (error) {
    console.error('Failed to sync notifications data:', error);
  }
};

const syncUserStatusData = async () => {
  try {
    // Synchroniser le statut utilisateur
    const response = await fetch('/api/user/status/sync', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      localStorage.setItem('user_status_sync_data', JSON.stringify({
        data,
        timestamp: Date.now()
      }));
      console.log('User status data synced successfully');
    }
  } catch (error) {
    console.error('Failed to sync user status data:', error);
  }
};

export default PeriodicBackgroundSyncService;
