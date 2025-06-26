import { useState, useEffect } from 'react';
import BackgroundSyncService from '../services/backgroundSyncService';

export function useOfflineMode() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [hasOfflineData, setHasOfflineData] = useState(false);
  const syncService = BackgroundSyncService.getInstance();

  useEffect(() => {
    // Initialize background sync service
    syncService.init();

    const handleOnline = () => {
      setIsOnline(true);
      // Sync pending data when back online
      syncService.syncPendingData();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    // Check for offline data
    const checkOfflineData = async () => {
      try {
        const pendingTickets = await syncService.getPendingItems('pending-tickets');
        const pendingActions = await syncService.getPendingItems('pending-actions');
        setHasOfflineData(pendingTickets.length > 0 || pendingActions.length > 0);
      } catch (error) {
        console.error('Error checking offline data:', error);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    checkOfflineData();
    
    // Check offline data periodically
    const interval = setInterval(checkOfflineData, 30000); // Every 30 seconds

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [syncService]);

  const saveForLater = async (action: any) => {
    try {
      await syncService.addPendingAction(action);
      setHasOfflineData(true);
    } catch (error) {
      console.error('Error saving action for later:', error);
    }
  };

  const saveTicketForLater = async (ticketData: any) => {
    try {
      await syncService.addPendingTicket(ticketData);
      setHasOfflineData(true);
    } catch (error) {
      console.error('Error saving ticket for later:', error);
    }
  };

  const getCachedData = async (key: string) => {
    try {
      return await syncService.getFromOfflineCache(key);
    } catch (error) {
      console.error('Error getting cached data:', error);
      return null;
    }
  };

  const cacheData = async (key: string, data: any) => {
    try {
      await syncService.cacheForOffline(key, data);
    } catch (error) {
      console.error('Error caching data:', error);
    }
  };

  return {
    isOnline,
    hasOfflineData,
    saveForLater,
    saveTicketForLater,
    getCachedData,
    cacheData,
    syncService
  };
}
