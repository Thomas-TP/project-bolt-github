// Custom Service Worker pour background sync et push notifications
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, NetworkFirst, CacheFirst } from 'workbox-strategies';

// Précacher les assets
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Background sync pour les tickets
const TICKET_SYNC_TAG = 'ticket-sync';
const NOTIFICATION_SYNC_TAG = 'notification-sync';

// Register background sync
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === TICKET_SYNC_TAG) {
    event.waitUntil(syncTickets());
  } else if (event.tag === NOTIFICATION_SYNC_TAG) {
    event.waitUntil(syncNotifications());
  }
});

// Sync tickets created offline
async function syncTickets() {
  try {
    // Get pending tickets from IndexedDB
    const pendingTickets = await getPendingTickets();
    
    for (const ticket of pendingTickets) {
      try {
        const response = await fetch('/api/tickets', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(ticket.data)
        });
        
        if (response.ok) {
          // Remove from pending queue
          await removePendingTicket(ticket.id);
          console.log('Ticket synced successfully:', ticket.id);
        }
      } catch (error) {
        console.error('Failed to sync ticket:', ticket.id, error);
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Sync notifications
async function syncNotifications() {
  try {
    console.log('Syncing notifications...');
    // Implement notification sync logic here
  } catch (error) {
    console.error('Notification sync failed:', error);
  }
}

// Push notification handler
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
  
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (error) {
    console.error('Error parsing push data:', error);
  }
  
  const title = data.title || 'HelpDesk GIT';
  const options = {
    body: data.body || 'Nouvelle notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: data.tag || 'general',
    data: data,
    actions: [
      {
        action: 'open',
        title: 'Ouvrir',
        icon: '/icons/icon-96x96.png'
      },
      {
        action: 'close',
        title: 'Fermer'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    const urlToOpen = event.notification.data?.url || '/dashboard';
    
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // Check if there's already a window open
          for (const client of clientList) {
            if (client.url.includes(self.location.origin) && 'focus' in client) {
              client.focus();
              client.navigate(urlToOpen);
              return;
            }
          }
          
          // Open new window if none exists
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
        })
    );
  }
});

// Periodic background sync (experimental)
self.addEventListener('periodicsync', (event) => {
  console.log('Periodic sync triggered:', event.tag);
  
  if (event.tag === 'ticket-update') {
    event.waitUntil(updateTickets());
  }
});

async function updateTickets() {
  try {
    console.log('Updating tickets in background...');
    // Implement periodic ticket updates
  } catch (error) {
    console.error('Periodic sync failed:', error);
  }
}

// Cache strategies
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images',
    plugins: [{
      cacheKeyWillBeUsed: async ({ request }) => {
        return `${request.url}?v=1`;
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
      }
    }]
  })
);

// Utility functions for IndexedDB
async function getPendingTickets() {
  // Implement IndexedDB query for pending tickets
  return [];
}

async function removePendingTicket(ticketId) {
  // Implement IndexedDB removal
  console.log('Removing pending ticket:', ticketId);
}

// Handle file share target
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  if (url.pathname === '/tickets/share' && event.request.method === 'POST') {
    event.respondWith(handleShareTarget(event.request));
  }
});

async function handleShareTarget(request) {
  try {
    const formData = await request.formData();
    const title = formData.get('title') || '';
    const text = formData.get('text') || '';
    const url = formData.get('url') || '';
    
    // Build redirect URL with shared data
    const params = new URLSearchParams();
    if (title) params.set('title', title);
    if (text) params.set('description', text);
    if (url) params.set('shared_url', url);
    
    const redirectUrl = `/tickets/create?${params.toString()}`;
    
    return Response.redirect(redirectUrl, 302);
  } catch (error) {
    console.error('Share target error:', error);
    return Response.redirect('/tickets/create', 302);
  }
}
