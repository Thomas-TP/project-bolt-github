import { Wifi, WifiOff, CloudOff, RefreshCw } from 'lucide-react';
import { useOfflineMode } from '../../hooks/useOfflineMode';

export function OfflineStatusBanner() {
  const { isOnline, hasOfflineData, syncService } = useOfflineMode();

  if (isOnline && !hasOfflineData) {
    return null; // Tout va bien, pas besoin d'afficher le banner
  }

  const handleSyncNow = async () => {
    if (isOnline) {
      await syncService.syncPendingData();
      window.location.reload(); // Refresh to update the UI
    }
  };

  return (
    <div className={`w-full px-4 py-2 text-sm font-medium flex items-center justify-between ${
      isOnline 
        ? 'bg-yellow-50 text-yellow-800 border-yellow-200' 
        : 'bg-red-50 text-red-800 border-red-200'
    } border-b`}>
      <div className="flex items-center space-x-2">
        {isOnline ? (
          <>
            <Wifi className="h-4 w-4" />
            <span>En ligne</span>
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4" />
            <span>Mode hors ligne</span>
          </>
        )}
        
        {hasOfflineData && (
          <>
            <span className="mx-2">•</span>
            <CloudOff className="h-4 w-4" />
            <span>Données en attente de synchronisation</span>
          </>
        )}
      </div>

      {isOnline && hasOfflineData && (
        <button
          onClick={handleSyncNow}
          className="flex items-center space-x-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200 transition-colors"
        >
          <RefreshCw className="h-3 w-3" />
          <span>Synchroniser maintenant</span>
        </button>
      )}
    </div>
  );
}

export function OfflineIndicator() {
  const { isOnline } = useOfflineMode();

  if (isOnline) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 z-50">
      <WifiOff className="h-4 w-4" />
      <span className="text-sm font-medium">Mode hors ligne</span>
    </div>
  );
}
