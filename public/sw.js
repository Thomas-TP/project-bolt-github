// Custom Service Worker pour les fonctionnalités PWA avancées
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst } from 'workbox-strategies';

// Précacher les fichiers générés par Vite-PWA
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Gestion des événements du service worker
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
  event.waitUntil(clients.claim());
});

// Gestion de la synchronisation en arrière-plan (Background Sync)
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  
  switch (event.tag) {
    case 'background-sync':
      event.waitUntil(handleBackgroundSync());
      break;
    case 'sync-tickets':
      event.waitUntil(syncTickets());
      break;
    case 'sync-notifications':
      event.waitUntil(syncNotifications());
      break;
    case 'manual-sync':
      event.waitUntil(handleManualSync());
      break;
    default:
      console.log('Unknown sync tag:', event.tag);
  }
});

// Gestion de la synchronisation périodique (Periodic Background Sync)
self.addEventListener('periodicsync', (event) => {
  console.log('Periodic sync triggered:', event.tag);
  
  switch (event.tag) {
    case 'sync-tickets':
      event.waitUntil(syncTickets());
      break;
    case 'sync-notifications':
      event.waitUntil(syncNotifications());
      break;
    case 'sync-user-status':
      event.waitUntil(syncUserStatus());
      break;
    default:
      console.log('Unknown periodic sync tag:', event.tag);
  }
});

// Gestion des notifications push
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event.data ? event.data.text() : 'No payload');
  
  const options = {
    body: event.data ? event.data.text() : 'Nouvelle notification HelpDesk GIT',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Voir',
        icon: '/icons/icon-72x72.png'
      },
      {
        action: 'close',
        title: 'Fermer',
        icon: '/icons/icon-72x72.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('HelpDesk GIT', options)
  );

  // Mettre à jour le badge
  if ('setAppBadge' in navigator) {
    navigator.setAppBadge();
  }
});

// Gestion des clics sur les notifications
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event.notification.tag);
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/dashboard')
    );
  } else if (event.action === 'close') {
    // Ne rien faire, la notification est déjà fermée
  } else {
    // Clic sur la notification principale
    event.waitUntil(
      clients.openWindow('/dashboard')
    );
  }
});

// Gestion des messages du client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLIENT_UPDATE_AVAILABLE') {
    // Informer tous les clients qu'une mise à jour est disponible
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        client.postMessage({
          type: 'UPDATE_AVAILABLE'
        });
      });
    });
  }
});

// Fonctions de synchronisation des données
async function handleBackgroundSync() {
  try {
    console.log('Handling background sync...');
    
    // Synchroniser les données en attente
    const pendingData = await getStoredPendingData();
    
    for (const item of pendingData) {
      await syncDataItem(item);
    }
    
    console.log('Background sync completed');
  } catch (error) {
    console.error('Background sync failed:', error);
    throw error;
  }
}

async function syncTickets() {
  try {
    console.log('Syncing tickets...');
    
    const response = await fetch('/api/tickets/sync', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      
      // Stocker les données dans IndexedDB
      await storeData('tickets', data);
      
      // Informer les clients de la mise à jour
      await notifyClients('TICKETS_UPDATED', data);
      
      console.log('Tickets synced successfully');
    }
  } catch (error) {
    console.error('Failed to sync tickets:', error);
    throw error;
  }
}

async function syncNotifications() {
  try {
    console.log('Syncing notifications...');
    
    const response = await fetch('/api/notifications/sync', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      
      // Stocker les données
      await storeData('notifications', data);
      
      // Mettre à jour le badge avec le nombre de notifications non lues
      const unreadCount = data.filter(notif => !notif.read).length;
      if ('setAppBadge' in navigator && unreadCount > 0) {
        navigator.setAppBadge(unreadCount);
      }
      
      // Informer les clients
      await notifyClients('NOTIFICATIONS_UPDATED', data);
      
      console.log('Notifications synced successfully');
    }
  } catch (error) {
    console.error('Failed to sync notifications:', error);
    throw error;
  }
}

async function syncUserStatus() {
  try {
    console.log('Syncing user status...');
    
    const response = await fetch('/api/user/status/sync', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      await storeData('userStatus', data);
      await notifyClients('USER_STATUS_UPDATED', data);
      console.log('User status synced successfully');
    }
  } catch (error) {
    console.error('Failed to sync user status:', error);
    throw error;
  }
}

async function handleManualSync() {
  console.log('Handling manual sync...');
  await Promise.all([
    syncTickets(),
    syncNotifications(),
    syncUserStatus()
  ]);
}

// Fonctions utilitaires pour IndexedDB
async function storeData(storeName, data) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('PWADatabase', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      store.clear();
      store.add({
        id: 1,
        data: data,
        timestamp: Date.now()
      });
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    };
    
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, { keyPath: 'id' });
      }
    };
  });
}

async function getStoredPendingData() {
  // Récupérer les données en attente de synchronisation
  // Cette fonction devrait récupérer les données stockées localement
  // qui n'ont pas encore été synchronisées avec le serveur
  return [];
}

async function syncDataItem(item) {
  // Synchroniser un élément de données spécifique
  console.log('Syncing data item:', item);
}

async function notifyClients(type, data) {
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({
      type: type,
      data: data
    });
  });
}

// Routes de cache personnalisées
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images-cache',
    plugins: [{
      cacheKeyWillBeUsed: async ({ request }) => {
        return `${request.url}?version=1`;
      }
    }]
  })
);

registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 3,
    plugins: [{
      cacheWillUpdate: async ({ response }) => {
        return response.status === 200 ? response : null;
      },
      handlerDidError: async () => {
        return caches.match('/offline.html');
      }
    }]
  })
);

console.log('Custom Service Worker loaded successfully');
