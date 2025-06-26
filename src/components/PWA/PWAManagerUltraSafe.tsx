import React, { useEffect, useState } from 'react';
import { Bell, Share2, RefreshCw, Wifi, WifiOff } from 'lucide-react';

interface PWAManagerProps {
  className?: string;
}

export const PWAManagerUltraSafe: React.FC<PWAManagerProps> = ({ className = '' }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [badgeCount, setBadgeCount] = useState(0);

  // État de support des APIs - initialisé à false pour éviter les erreurs
  const [apiSupport, setApiSupport] = useState({
    badge: false,
    share: false,
    periodicSync: false,
    serviceWorker: false
  });

  useEffect(() => {
    const safeCheckOnlineStatus = () => {
      try {
        setIsOnline(navigator?.onLine ?? true);
      } catch (error) {
        console.warn('Error checking online status:', error);
        setIsOnline(true); // Défaut sûr
      }
    };

    const safeCheckAPISupport = () => {
      const support = {
        badge: false,
        share: false,
        periodicSync: false,
        serviceWorker: false
      };

      try {
        // Vérification du Service Worker
        if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
          support.serviceWorker = true;
        }
      } catch (error) {
        console.warn('Error checking serviceWorker support:', error);
      }

      try {
        // Vérification de Badge API
        if (typeof navigator !== 'undefined' && 
            typeof navigator.setAppBadge === 'function' && 
            typeof navigator.clearAppBadge === 'function') {
          support.badge = true;
        }
      } catch (error) {
        console.warn('Error checking badge API support:', error);
      }

      try {
        // Vérification de Web Share API
        if (typeof navigator !== 'undefined' && 
            typeof navigator.share === 'function') {
          support.share = true;
        }
      } catch (error) {
        console.warn('Error checking share API support:', error);
      }

      try {
        // Vérification de Periodic Sync API
        if (typeof navigator !== 'undefined' && 
            'serviceWorker' in navigator &&
            typeof window !== 'undefined' &&
            window.ServiceWorkerRegistration &&
            'periodicSync' in window.ServiceWorkerRegistration.prototype) {
          support.periodicSync = true;
        }
      } catch (error) {
        console.warn('Error checking periodic sync support:', error);
      }

      setApiSupport(support);
      console.log('PWA API Support detected:', support);
    };

    // Initialisation sécurisée
    safeCheckOnlineStatus();
    safeCheckAPISupport();

    // Écouters de connectivité avec gestion d'erreur
    const handleOnline = () => {
      try {
        setIsOnline(true);
      } catch (error) {
        console.warn('Error in online handler:', error);
      }
    };

    const handleOffline = () => {
      try {
        setIsOnline(false);
      } catch (error) {
        console.warn('Error in offline handler:', error);
      }
    };

    // Gestionnaire de messages du service worker ultra-sécurisé
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      try {
        if (event?.data && typeof event.data === 'object' && event.data.type === 'UPDATE_AVAILABLE') {
          setUpdateAvailable(true);
        }
      } catch (error) {
        console.warn('Error handling service worker message:', error);
      }
    };

    // Ajout des écouteurs avec gestion d'erreur
    try {
      if (typeof window !== 'undefined') {
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
      }
    } catch (error) {
      console.warn('Error adding connectivity listeners:', error);
    }

    try {
      if (apiSupport.serviceWorker && typeof navigator !== 'undefined' && navigator.serviceWorker) {
        navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
      }
    } catch (error) {
      console.warn('Error adding service worker listener:', error);
    }

    // Nettoyage avec gestion d'erreur
    return () => {
      try {
        if (typeof window !== 'undefined') {
          window.removeEventListener('online', handleOnline);
          window.removeEventListener('offline', handleOffline);
        }
      } catch (error) {
        console.warn('Error removing connectivity listeners:', error);
      }

      try {
        if (apiSupport.serviceWorker && typeof navigator !== 'undefined' && navigator.serviceWorker) {
          navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
        }
      } catch (error) {
        console.warn('Error removing service worker listener:', error);
      }
    };
  }, []); // Pas de dépendances pour éviter les re-renders

  const handleUpdateApp = async () => {
    try {
      if (!apiSupport.serviceWorker || typeof navigator === 'undefined') {
        console.warn('Service Worker not supported for update');
        return;
      }

      const registration = await navigator.serviceWorker.getRegistration();
      if (registration?.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        setTimeout(() => {
          try {
            window.location.reload();
          } catch (error) {
            console.error('Error reloading page:', error);
          }
        }, 100);
      }
    } catch (error) {
      console.error('Failed to update app:', error);
    }
  };

  const handleShareApp = async () => {
    try {
      const shareData = {
        title: 'HelpDesk GIT - Geneva Institute of Technology',
        text: 'Plateforme de support technique du Geneva Institute of Technology',
        url: typeof window !== 'undefined' ? window.location.origin : 'https://www.git.swiss'
      };

      if (apiSupport.share && typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share(shareData);
        return;
      }

      // Fallback: clipboard
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareData.url);
        alert('Lien copié dans le presse-papier !');
        return;
      }

      // Fallback final: sélection de texte
      console.log('Share not supported, URL:', shareData.url);
    } catch (error) {
      console.error('Failed to share app:', error);
      // Fallback silencieux - ne pas alerter l'utilisateur
    }
  };

  const handleSyncData = async () => {
    try {
      if (!apiSupport.serviceWorker || typeof navigator === 'undefined') {
        console.warn('Service Worker not supported for sync');
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      if (registration && 'sync' in registration) {
        await (registration as any).sync.register('manual-sync');
      }

      // Simulation de mise à jour du badge
      setBadgeCount(0);
    } catch (error) {
      console.error('Failed to sync data:', error);
    }
  };

  const handleClearBadge = async () => {
    try {
      if (apiSupport.badge && typeof navigator !== 'undefined' && navigator.clearAppBadge) {
        await navigator.clearAppBadge();
      }
      setBadgeCount(0);
    } catch (error) {
      console.error('Failed to clear badge:', error);
      setBadgeCount(0); // Au moins réinitialiser l'UI
    }
  };

  // Render sécurisé avec vérifications multiples
  if (typeof window === 'undefined') {
    return null; // SSR safety
  }

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

      {/* Badge de notifications - seulement si supporté */}
      {apiSupport.badge && badgeCount > 0 && (
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

      {/* Bouton de synchronisation - toujours visible */}
      <button
        onClick={handleSyncData}
        className="p-1 text-gray-600 hover:text-blue-600 transition-colors"
        title="Synchroniser les données"
      >
        <RefreshCw className="w-4 h-4" />
      </button>

      {/* Bouton de partage - seulement si supporté */}
      {apiSupport.share && (
        <button
          onClick={handleShareApp}
          className="p-1 text-gray-600 hover:text-blue-600 transition-colors"
          title="Partager l'application"
        >
          <Share2 className="w-4 h-4" />
        </button>
      )}

      {/* Notification de mise à jour - seulement si disponible */}
      {updateAvailable && (
        <button
          onClick={handleUpdateApp}
          className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
        >
          Mettre à jour
        </button>
      )}

      {/* Indicateurs de support - version minimaliste */}
      <div className="flex items-center space-x-1 text-xs text-gray-500">
        {apiSupport.serviceWorker && (
          <span className="px-1 py-0.5 bg-green-100 text-green-800 rounded text-xs">SW</span>
        )}
        {apiSupport.badge && (
          <span className="px-1 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">Badge</span>
        )}
        {apiSupport.share && (
          <span className="px-1 py-0.5 bg-purple-100 text-purple-800 rounded text-xs">Share</span>
        )}
      </div>
    </div>
  );
};

export default PWAManagerUltraSafe;
