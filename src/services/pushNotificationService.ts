// Push notification service
class PushNotificationService {
  private static instance: PushNotificationService;
  private vapidPublicKey = 'BMwmlVZT1TUIjQhGu_XP196TbXmCaWK-neSsBXvb_yNXFfz9DLIyB-mF6WFLPzCFNGN_ulV2PMHfrlb-TbYXzjQ';

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    if (!('serviceWorker' in navigator)) {
      console.log('This browser does not support service workers');
      return false;
    }

    if (!('PushManager' in window)) {
      console.log('This browser does not support push messaging');
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  async subscribe(): Promise<PushSubscription | null> {
    try {
      const hasPermission = await this.requestPermission();
      if (!hasPermission) {
        return null;
      }

      const registration = await navigator.serviceWorker.ready;
      
      // Vérifier si déjà abonné
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        return existingSubscription;
      }

      // Créer un nouvel abonnement
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
      });

      // Envoyer l'abonnement au serveur
      await this.sendSubscriptionToServer(subscription);
      
      return subscription;
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      return null;
    }
  }

  async unsubscribe(): Promise<boolean> {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        const result = await subscription.unsubscribe();
        if (result) {
          await this.removeSubscriptionFromServer(subscription);
        }
        return result;
      }
      
      return true;
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      return false;
    }
  }

  async getSubscription(): Promise<PushSubscription | null> {
    try {
      const registration = await navigator.serviceWorker.ready;
      return await registration.pushManager.getSubscription();
    } catch (error) {
      console.error('Error getting push subscription:', error);
      return null;
    }
  }

  async isSubscribed(): Promise<boolean> {
    const subscription = await this.getSubscription();
    return subscription !== null;
  }

  // Envoyer une notification locale pour tester
  async sendLocalNotification(title: string, options: NotificationOptions = {}): Promise<void> {
    if (!('Notification' in window)) return;
    
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      new Notification(title, {
        body: options.body || 'Notification de test',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        tag: options.tag || 'test',
        ...options
      });
    }
  }

  private async sendSubscriptionToServer(subscription: PushSubscription): Promise<void> {
    try {
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          userAgent: navigator.userAgent
        })
      });
    } catch (error) {
      console.error('Error sending subscription to server:', error);
    }
  }

  private async removeSubscriptionFromServer(subscription: PushSubscription): Promise<void> {
    try {
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: subscription.toJSON()
        })
      });
    } catch (error) {
      console.error('Error removing subscription from server:', error);
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Enregistrer pour periodic sync
  async registerPeriodicSync(): Promise<void> {
    try {
      const registration = await navigator.serviceWorker.ready;
      if ('periodicSync' in registration) {
        const status = await navigator.permissions.query({ name: 'periodic-background-sync' as any });
        if (status.state === 'granted') {
          await (registration as any).periodicSync.register('ticket-update', {
            minInterval: 24 * 60 * 60 * 1000, // 24 heures
          });
          console.log('Periodic sync registered');
        }
      }
    } catch (error) {
      console.log('Periodic sync not supported:', error);
    }
  }
}

export default PushNotificationService;
