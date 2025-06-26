/**
 * Service de gestion des badges de l'application
 * Utilise l'API Badge pour afficher des notifications sur l'icône de l'application
 */

export interface BadgeOptions {
  count?: number;
  type?: 'number' | 'flag';
}

export class BadgeService {
  private static instance: BadgeService;
  private currentBadgeCount: number = 0;

  public static getInstance(): BadgeService {
    if (!BadgeService.instance) {
      BadgeService.instance = new BadgeService();
    }
    return BadgeService.instance;
  }

  /**
   * Définit le badge de l'application
   */
  async setBadge(options: BadgeOptions = {}): Promise<boolean> {
    try {
      if (!this.isSupported()) {
        console.warn('Badge API not supported');
        return false;
      }

      const { count = 0, type = 'number' } = options;

      if (type === 'flag') {
        // Afficher un badge sans nombre (juste un point)
        await (navigator as any).setAppBadge();
        this.currentBadgeCount = 1;
      } else {
        // Afficher un badge avec un nombre
        if (count > 0) {
          await (navigator as any).setAppBadge(count);
          this.currentBadgeCount = count;
        } else {
          await this.clearBadge();
        }
      }

      console.log('Badge set successfully:', count);
      return true;
    } catch (error) {
      console.error('Failed to set badge:', error);
      return false;
    }
  }

  /**
   * Efface le badge de l'application
   */
  async clearBadge(): Promise<boolean> {
    try {
      if (!this.isSupported()) {
        return false;
      }

      await (navigator as any).clearAppBadge();
      this.currentBadgeCount = 0;
      console.log('Badge cleared successfully');
      return true;
    } catch (error) {
      console.error('Failed to clear badge:', error);
      return false;
    }
  }

  /**
   * Incrémente le badge
   */
  async incrementBadge(increment: number = 1): Promise<boolean> {
    const newCount = this.currentBadgeCount + increment;
    return await this.setBadge({ count: newCount });
  }

  /**
   * Décrémente le badge
   */
  async decrementBadge(decrement: number = 1): Promise<boolean> {
    const newCount = Math.max(0, this.currentBadgeCount - decrement);
    return await this.setBadge({ count: newCount });
  }

  /**
   * Obtient le nombre actuel du badge
   */
  getCurrentBadgeCount(): number {
    return this.currentBadgeCount;
  }

  /**
   * Met à jour le badge en fonction du nombre de tickets non lus
   */
  async updateTicketsBadge(unreadCount: number): Promise<boolean> {
    return await this.setBadge({ count: unreadCount });
  }

  /**
   * Met à jour le badge en fonction du nombre de notifications non lues
   */
  async updateNotificationsBadge(unreadCount: number): Promise<boolean> {
    return await this.setBadge({ count: unreadCount });
  }

  /**
   * Active un badge de notification générale
   */
  async setNotificationFlag(): Promise<boolean> {
    return await this.setBadge({ type: 'flag' });
  }
  /**
   * Vérifie si l'API Badge est supportée
   */
  isSupported(): boolean {
    try {
      return 'setAppBadge' in navigator && 'clearAppBadge' in navigator;
    } catch (error) {
      console.warn('Error checking badge API support:', error);
      return false;
    }
  }

  /**
   * Synchronise le badge avec les données locales
   */
  async syncBadgeWithData(): Promise<void> {
    try {
      // Compter les tickets non lus
      const ticketsData = localStorage.getItem('tickets_data');
      let unreadTickets = 0;
      
      if (ticketsData) {
        const tickets = JSON.parse(ticketsData);
        unreadTickets = tickets.filter((ticket: any) => !ticket.read).length;
      }

      // Compter les notifications non lues
      const notificationsData = localStorage.getItem('notifications_data');
      let unreadNotifications = 0;
      
      if (notificationsData) {
        const notifications = JSON.parse(notificationsData);
        unreadNotifications = notifications.filter((notif: any) => !notif.read).length;
      }

      // Mettre à jour le badge avec le total
      const totalUnread = unreadTickets + unreadNotifications;
      await this.setBadge({ count: totalUnread });

    } catch (error) {
      console.error('Failed to sync badge with data:', error);
    }
  }
  /**
   * Configure la synchronisation automatique du badge
   */
  setupAutoSync(): void {
    try {
      // Synchroniser le badge toutes les 5 minutes
      setInterval(() => {
        this.syncBadgeWithData().catch(console.error);
      }, 5 * 60 * 1000);

      // Synchroniser au chargement de la page
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          this.syncBadgeWithData().catch(console.error);
        });
      } else {
        this.syncBadgeWithData().catch(console.error);
      }

      // Synchroniser quand la page devient visible
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          this.syncBadgeWithData().catch(console.error);
        }
      });
    } catch (error) {
      console.error('Failed to setup badge auto sync:', error);
    }
  }
}

// Hook React pour utiliser le service Badge
export const useBadge = () => {
  const badgeService = BadgeService.getInstance();

  const setBadge = async (options: BadgeOptions = {}) => {
    return await badgeService.setBadge(options);
  };

  const clearBadge = async () => {
    return await badgeService.clearBadge();
  };

  const incrementBadge = async (increment?: number) => {
    return await badgeService.incrementBadge(increment);
  };

  const decrementBadge = async (decrement?: number) => {
    return await badgeService.decrementBadge(decrement);
  };

  const updateTicketsBadge = async (count: number) => {
    return await badgeService.updateTicketsBadge(count);
  };

  const updateNotificationsBadge = async (count: number) => {
    return await badgeService.updateNotificationsBadge(count);
  };

  const isSupported = badgeService.isSupported();
  const currentCount = badgeService.getCurrentBadgeCount();

  return {
    setBadge,
    clearBadge,
    incrementBadge,
    decrementBadge,
    updateTicketsBadge,
    updateNotificationsBadge,
    isSupported,
    currentCount,
    syncBadgeWithData: () => badgeService.syncBadgeWithData()
  };
};

export default BadgeService;
