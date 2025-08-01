import React, { useEffect, useState } from 'react';
import { Bell, Share2, RefreshCw, Wifi, WifiOff } from 'lucide-react';

interface PWAManagerProps {
  className?: string;
}

export const PWAManagerSafe: React.FC<PWAManagerProps> = ({ className = '' }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [periodicSyncSupported, setPeriodicSyncSupported] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [badgeCount, setBadgeCount] = useState(0);
  const [badgeSupported, setBadgeSupported] = useState(false);
  const [shareSupported, setShareSupported] = useState(false);

  useEffect(() => {
    const initializePWAServices = async () => {
      try {
        // Vérifier le support des APIs de manière sécurisée
        const checkSupport = () => {
          try {
            // Badge API
            const badgeApiSupported = 'setAppBadge' in navigator && 'clearAppBadge' in navigator;
            setBadgeSupported(badgeApiSupported);

            // Web Share API
            const shareApiSupported = 'share' in navigator;
            setShareSupported(shareApiSupported);

            // Periodic Sync API
            const periodicSyncApiSupported = 'serviceWorker' in navigator && 
              'periodicSync' in window.ServiceWorkerRegistration.prototype;
            setPeriodicSyncSupported(periodicSyncApiSupported);

            console.log('PWA API Support:', {
              badge: badgeApiSupported,
              share: shareApiSupported,
              periodicSync: periodicSyncApiSupported
            });
          } catch (error) {
            console.warn('Error checking PWA API support:', error);
          }
        };

        checkSupport();

        // Synchroniser le badge de manière sécurisée
        if (badgeSupported) {
          try {
            // Simuler un compte de notifications
            const mockUnreadCount = 0; // À remplacer par les vraies données
            setBadgeCount(mockUnreadCount);
          } catch (error) {
            console.warn('Error setting badge:', error);
          }
        }

      } catch (error) {
        console.error('PWA services initialization failed:', error);
      }
    };

    initializePWAServices();

    // Écouter les changements de connectivité
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Écouter les mises à jour du service worker de manière sécurisée
    if ('serviceWorker' in navigator) {
      try {
        navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
      } catch (error) {
        console.warn('Error setting up service worker listener:', error);
      }
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if ('serviceWorker' in navigator) {
        try {
          navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
        } catch (error) {
          console.warn('Error removing service worker listener:', error);
        }
      }
    };
  }, [badgeSupported]);

  const handleServiceWorkerMessage = (event: MessageEvent) => {
    try {
      if (event.data && event.data.type === 'UPDATE_AVAILABLE') {
        setUpdateAvailable(true);
      }
    } catch (error) {
      console.warn('Error handling service worker message:', error);
    }
  };

  const handleUpdateApp = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration && registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          window.location.reload();
        }
      }
    } catch (error) {
      console.error('Failed to update app:', error);
    }
  };

  const handleShareApp = async () => {
    try {
      if (shareSupported && 'share' in navigator) {
        await navigator.share({
          title: 'HelpDesk GIT - Geneva Institute of Technology',
          text: 'Plateforme de support technique du Geneva Institute of Technology',
          url: window.location.origin
        });
      } else {
        // Fallback: copier dans le presse-papier
        await navigator.clipboard?.writeText(window.location.origin);
        alert('Lien copié dans le presse-papier !');
      }
    } catch (error) {
      console.error('Failed to share app:', error);
      // Fallback silencieux
      try {
        await navigator.clipboard?.writeText(window.location.origin);
        alert('Lien copié dans le presse-papier !');
      } catch {
        // Fallback final: ne rien faire
      }
    }
  };

  const handleSyncData = async () => {
    try {
      // Déclencher une synchronisation manuelle
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        if ('sync' in registration) {
          await (registration as any).sync.register('manual-sync');
        }
      }

      // Simuler la mise à jour du badge
      setBadgeCount(0);
    } catch (error) {
      console.error('Failed to sync data:', error);
    }
  };

  const handleClearBadge = async () => {
    try {
      if (badgeSupported && 'clearAppBadge' in navigator) {
        await (navigator as any).clearAppBadge();
      }
      setBadgeCount(0);
    } catch (error) {
      console.error('Failed to clear badge:', error);
      setBadgeCount(0); // Réinitialiser quand même l'UI
    }
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Indicateur de connectivité */}
      <div className="flex items-center">
        {isOnline ? (
          <div title="En ligne">
            <Wifi className="w-4 h-4 text-green-500" />
          </div>
        ) : (
          <div title="Hors ligne">
            <WifiOff className="w-4 h-4 text-red-500" />
          </div>
        )}
      </div>

      {/* Badge de notifications */}
      {badgeSupported && badgeCount > 0 && (
        <button
          onClick={handleClearBadge}
          className="relative flex items-center p-1 text-gray-600 hover:text-blue-600 transition-colors"
          title={`${badgeCount} notification(s) non lue(s)`}
        >
          <Bell className="w-4 h-4" />
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
            {badgeCount > 9 ? '9+' : badgeCount}
          </span>
        </button>
      )}

      {/* Bouton de synchronisation */}
      <button
        onClick={handleSyncData}
        className="p-1 text-gray-600 hover:text-blue-600 transition-colors"
        title="Synchroniser les données"
      >
        <RefreshCw className="w-4 h-4" />
      </button>

      {/* Bouton de partage */}
      {shareSupported && (
        <button
          onClick={handleShareApp}
          className="p-1 text-gray-600 hover:text-blue-600 transition-colors"
          title="Partager l'application"
        >
          <Share2 className="w-4 h-4" />
        </button>
      )}

      {/* Notification de mise à jour */}
      {updateAvailable && (
        <button
          onClick={handleUpdateApp}
          className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
        >
          Mettre à jour
        </button>
      )}

      {/* Indicateurs de support des APIs */}
      <div className="flex items-center space-x-1 text-xs text-gray-500">
        {periodicSyncSupported && (
          <span className="px-1 py-0.5 bg-green-100 text-green-800 rounded">Sync</span>
        )}
        {badgeSupported && (
          <span className="px-1 py-0.5 bg-blue-100 text-blue-800 rounded">Badge</span>
        )}
        {shareSupported && (
          <span className="px-1 py-0.5 bg-purple-100 text-purple-800 rounded">Share</span>
        )}
      </div>
    </div>
  );
};

export default PWAManagerSafe;
