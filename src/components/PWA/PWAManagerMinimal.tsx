import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

interface PWAManagerProps {
  className?: string;
}

// Version minimaliste avec détection de connectivité sécurisée
export const PWAManagerMinimal: React.FC<PWAManagerProps> = ({ className = '' }) => {
  // Détection de connectivité sécurisée
  const [isOnline, setIsOnline] = useState(() => {
    try {
      return typeof navigator !== 'undefined' ? navigator.onLine : true;
    } catch {
      return true;
    }
  });

  const [backgroundSyncSupported, setBackgroundSyncSupported] = useState(false);

  useEffect(() => {
    // Détection sécurisée du background sync
    const checkBackgroundSync = () => {
      try {
        if (typeof window !== 'undefined' && 
            'serviceWorker' in navigator && 
            'sync' in window.ServiceWorkerRegistration.prototype) {
          setBackgroundSyncSupported(true);
        }
      } catch (error) {
        console.warn('Background sync check failed:', error);
      }
    };

    // Gestionnaires de connectivité sécurisés
    const handleOnline = () => {
      try {
        setIsOnline(true);
        console.log('Connection restored');
      } catch (error) {
        console.warn('Online handler error:', error);
      }
    };

    const handleOffline = () => {
      try {
        setIsOnline(false);
        console.log('Connection lost - background sync will handle updates');
      } catch (error) {
        console.warn('Offline handler error:', error);
      }
    };

    // Initialisation
    checkBackgroundSync();

    // Ajout des écouteurs sécurisés
    try {
      if (typeof window !== 'undefined') {
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
      }
    } catch (error) {
      console.warn('Event listeners setup failed:', error);
    }

    // Nettoyage
    return () => {
      try {
        if (typeof window !== 'undefined') {
          window.removeEventListener('online', handleOnline);
          window.removeEventListener('offline', handleOffline);
        }
      } catch (error) {
        console.warn('Event listeners cleanup failed:', error);
      }
    };
  }, []);

  // Action de synchronisation manuelle sécurisée
  const handleManualSync = async () => {
    try {
      if (backgroundSyncSupported && 'serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        if ('sync' in registration) {
          await (registration as any).sync.register('manual-sync');
          console.log('Manual sync triggered');
        }
      } else {
        console.log('Background sync not supported - triggering immediate sync');
        // Ici on pourrait déclencher une synchronisation immédiate
      }
    } catch (error) {
      console.error('Manual sync failed:', error);
    }
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Indicateur de connectivité dynamique */}
      <div className="flex items-center">
        {isOnline ? (
          <div title="En ligne - Synchronisation active">
            <Wifi className="w-4 h-4 text-green-500" />
          </div>
        ) : (
          <div title="Hors ligne - Background sync actif">
            <WifiOff className="w-4 h-4 text-orange-500" />
          </div>
        )}
      </div>

      {/* Bouton de synchronisation manuelle */}
      <button
        onClick={handleManualSync}
        className="p-1 text-gray-600 hover:text-blue-600 transition-colors"
        title="Synchroniser manuellement"
      >
        <RefreshCw className="w-4 h-4" />
      </button>

      {/* Indicateurs de support PWA */}
      <div className="flex items-center space-x-1 text-xs text-gray-500">
        <span className="px-1 py-0.5 bg-green-100 text-green-800 rounded text-xs">PWA</span>
        {backgroundSyncSupported && (
          <span className="px-1 py-0.5 bg-blue-100 text-blue-800 rounded text-xs" title="Background Sync supporté">
            Sync
          </span>
        )}
      </div>
    </div>
  );
};

export default PWAManagerMinimal;
