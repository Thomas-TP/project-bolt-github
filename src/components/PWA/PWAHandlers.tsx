import { useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

export function ShareHandler() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Handle share target
    if (location.pathname === '/tickets/share') {
      const title = searchParams.get('title') || '';
      const text = searchParams.get('text') || '';
      const url = searchParams.get('url') || '';
      
      // Redirect to create ticket with shared data
      const params = new URLSearchParams();
      if (title) params.set('title', title);
      if (text) params.set('description', text);
      if (url) params.set('url', url);
      
      navigate(`/tickets/create?${params.toString()}`);
    }
  }, [location, searchParams, navigate]);

  return null;
}

// Hook pour gérer les fichiers partagés - VERSION SÉCURISÉE
export function useFileHandler() {
  useEffect(() => {
    try {
      // Register file handler
      if (typeof window !== 'undefined' && 'launchQueue' in window) {
        const launchQueue = (window as any).launchQueue;
        if (launchQueue && typeof launchQueue.setConsumer === 'function') {
          launchQueue.setConsumer((launchParams: any) => {
            try {
              if (launchParams?.files && Array.isArray(launchParams.files) && launchParams.files.length > 0) {
                // Handle file opening
                console.log('Files to handle:', launchParams.files);
                // Redirect to ticket creation with files
                if (typeof window !== 'undefined' && window.location) {
                  window.location.href = '/tickets/create?files=true';
                }
              }
            } catch (error) {
              console.error('Error handling launch files:', error);
            }
          });
        }
      }
    } catch (error) {
      console.error('Error setting up file handler:', error);
    }
  }, []);
}

// Hook pour gérer les notifications push - VERSION SÉCURISÉE
export function usePushNotifications() {
  const requestPermission = async () => {
    try {
      if (typeof window === 'undefined' || typeof navigator === 'undefined') {
        console.warn('Window or navigator not available');
        return null;
      }

      if (!('Notification' in window)) {
        console.warn('Notifications not supported');
        return null;
      }

      if (!('serviceWorker' in navigator)) {
        console.warn('Service Worker not supported');
        return null;
      }

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('Notification permission not granted:', permission);
        return null;
      }

      const registration = await navigator.serviceWorker.ready;
      if (!registration || !registration.pushManager) {
        console.warn('Push manager not available');
        return null;
      }
      
      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          'BEl62iUYgUivxIkv69yViEuiBIa40HI80NKZkZgFmKcB-s3hl4V9ScyG1ZnCt1yKdRD0wSJ2tBQ5Y9k4jH7v4Ys'
        )
      });
      
      console.log('Push subscription:', subscription);
      return subscription;
    } catch (error) {
      console.error('Error requesting push notification permission:', error);
      return null;
    }
  };

  return { requestPermission };
}

function urlBase64ToUint8Array(base64String: string) {
  try {
    if (!base64String || typeof base64String !== 'string') {
      throw new Error('Invalid base64 string');
    }

    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    if (typeof window === 'undefined' || !window.atob) {
      throw new Error('atob not available');
    }

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  } catch (error) {
    console.error('Error converting base64 to Uint8Array:', error);
    return new Uint8Array(0); // Return empty array as fallback
  }
}
