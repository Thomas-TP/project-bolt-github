/**
 * Service de partage web utilisant l'API Web Share
 * Permet de partager du contenu via les applications natives du système
 */

export interface ShareData {
  title?: string;
  text?: string;
  url?: string;
  files?: File[];
}

export interface ShareOptions {
  fallbackUrl?: string;
  fallbackText?: string;
}

export class WebShareService {
  private static instance: WebShareService;

  public static getInstance(): WebShareService {
    if (!WebShareService.instance) {
      WebShareService.instance = new WebShareService();
    }
    return WebShareService.instance;
  }

  /**
   * Partage du contenu via l'API Web Share
   */
  async share(data: ShareData, options: ShareOptions = {}): Promise<boolean> {
    try {
      if (!this.isSupported()) {
        return this.fallbackShare(data, options);
      }

      // Vérifier si les fichiers sont supportés
      if (data.files && data.files.length > 0 && !this.canShareFiles()) {
        console.warn('File sharing not supported, sharing without files');
        const { files, ...shareDataWithoutFiles } = data;
        await navigator.share(shareDataWithoutFiles);
      } else {
        await navigator.share(data);
      }

      console.log('Content shared successfully');
      return true;
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        console.log('Share was cancelled by user');
        return false;
      }
      console.error('Failed to share:', error);
      return this.fallbackShare(data, options);
    }
  }

  /**
   * Partage un ticket de support
   */
  async shareTicket(ticketId: string, title: string, description: string): Promise<boolean> {
    const shareData: ShareData = {
      title: `Ticket #${ticketId}: ${title}`,
      text: `Ticket de support: ${description}`,
      url: `${window.location.origin}/tickets/${ticketId}`
    };

    return await this.share(shareData, {
      fallbackText: `Consultez ce ticket de support: ${shareData.url}`
    });
  }

  /**
   * Partage un lien vers le tableau de bord
   */
  async shareDashboard(): Promise<boolean> {
    const shareData: ShareData = {
      title: 'HelpDesk GIT - Geneva Institute of Technology',
      text: 'Plateforme de support technique du Geneva Institute of Technology',
      url: `${window.location.origin}/dashboard`
    };

    return await this.share(shareData, {
      fallbackText: `Découvrez notre plateforme de support: ${shareData.url}`
    });
  }

  /**
   * Partage un rapport ou document
   */
  async shareReport(title: string, description: string, file?: File): Promise<boolean> {
    const shareData: ShareData = {
      title: `Rapport: ${title}`,
      text: description,
      url: window.location.href
    };

    if (file && this.canShareFiles()) {
      shareData.files = [file];
    }

    return await this.share(shareData, {
      fallbackText: `Rapport disponible: ${title} - ${description}`
    });
  }

  /**
   * Partage les détails de contact du support
   */
  async shareContactInfo(): Promise<boolean> {
    const shareData: ShareData = {
      title: 'Contact Support GIT',
      text: 'Contactez notre équipe de support technique du Geneva Institute of Technology',
      url: `${window.location.origin}/contact`
    };

    return await this.share(shareData, {
      fallbackText: 'Support GIT - Geneva Institute of Technology. Contactez-nous pour toute assistance technique.'
    });
  }

  /**
   * Partage un message d'erreur ou de diagnostic
   */
  async shareErrorReport(errorMessage: string, errorDetails?: string): Promise<boolean> {
    const shareData: ShareData = {
      title: 'Rapport d\'erreur - HelpDesk GIT',
      text: `Erreur rencontrée: ${errorMessage}${errorDetails ? '\n\nDétails: ' + errorDetails : ''}`,
      url: window.location.href
    };

    return await this.share(shareData, {
      fallbackText: `Erreur: ${errorMessage}`
    });
  }

  /**
   * Méthode de partage de secours quand l'API Web Share n'est pas disponible
   */
  private async fallbackShare(data: ShareData, options: ShareOptions): Promise<boolean> {
    try {
      // Essayer de copier dans le presse-papiers
      const shareText = options.fallbackText || 
                       `${data.title || ''}\n${data.text || ''}\n${data.url || ''}`.trim();

      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareText);
        this.showNotification('Contenu copié dans le presse-papiers !');
        return true;
      }

      // Fallback pour les anciens navigateurs
      const textArea = document.createElement('textarea');
      textArea.value = shareText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      this.showNotification('Contenu copié dans le presse-papiers !');
      return true;
    } catch (error) {
      console.error('Fallback share failed:', error);
      // Dernière option: ouvrir une nouvelle fenêtre avec les réseaux sociaux
      this.openSocialShare(data);
      return false;
    }
  }

  /**
   * Ouvre une fenêtre de partage sur les réseaux sociaux
   */
  private openSocialShare(data: ShareData): void {
    const shareUrl = encodeURIComponent(data.url || window.location.href);
    const shareText = encodeURIComponent(data.text || data.title || '');

    // Partage Twitter
    const twitterUrl = `https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`;
    window.open(twitterUrl, '_blank', 'width=550,height=420');
  }

  /**
   * Affiche une notification à l'utilisateur
   */
  private showNotification(message: string): void {
    // Créer une notification temporaire
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #4CAF50;
      color: white;
      padding: 12px 24px;
      border-radius: 4px;
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    `;

    document.body.appendChild(notification);

    // Supprimer après 3 secondes
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }

  /**
   * Vérifie si l'API Web Share est supportée
   */
  isSupported(): boolean {
    return 'share' in navigator;
  }

  /**
   * Vérifie si le partage de fichiers est supporté
   */
  canShareFiles(): boolean {
    return 'canShare' in navigator && navigator.canShare && 
           navigator.canShare({ files: [new File([''], 'test.txt')] });
  }

  /**
   * Vérifie si un type de contenu peut être partagé
   */
  canShare(data: ShareData): boolean {
    if (!this.isSupported()) {
      return false;
    }

    if ('canShare' in navigator && navigator.canShare) {
      return navigator.canShare(data);
    }

    return true; // Assume it can share if canShare is not available
  }
}

// Hook React pour utiliser le service Web Share
export const useWebShare = () => {
  const webShareService = WebShareService.getInstance();

  const share = async (data: ShareData, options?: ShareOptions) => {
    return await webShareService.share(data, options);
  };

  const shareTicket = async (ticketId: string, title: string, description: string) => {
    return await webShareService.shareTicket(ticketId, title, description);
  };

  const shareDashboard = async () => {
    return await webShareService.shareDashboard();
  };

  const shareReport = async (title: string, description: string, file?: File) => {
    return await webShareService.shareReport(title, description, file);
  };

  const shareContactInfo = async () => {
    return await webShareService.shareContactInfo();
  };

  const shareErrorReport = async (errorMessage: string, errorDetails?: string) => {
    return await webShareService.shareErrorReport(errorMessage, errorDetails);
  };

  const isSupported = webShareService.isSupported();
  const canShareFiles = webShareService.canShareFiles();

  return {
    share,
    shareTicket,
    shareDashboard,
    shareReport,
    shareContactInfo,
    shareErrorReport,
    isSupported,
    canShareFiles,
    canShare: (data: ShareData) => webShareService.canShare(data)
  };
};

export default WebShareService;
