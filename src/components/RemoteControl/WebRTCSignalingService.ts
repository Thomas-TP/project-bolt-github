// Service de signaling WebRTC simplifié pour la démo
export class WebRTCSignalingService {
  private roomId: string;
  private isAgent: boolean;
  private onMessage: (message: any) => void;

  constructor(roomId: string, isAgent: boolean, onMessage: (message: any) => void) {
    this.roomId = roomId;
    this.isAgent = isAgent;
    this.onMessage = onMessage;
  }

  // Connexion au serveur de signaling (simulée)
  connect(): Promise<void> {
    return new Promise((resolve) => {
      console.log('✅ Connecté au serveur de signaling (simulé)');
      setTimeout(() => {
        this.joinRoom();
        resolve();
      }, 1000);
    });
  }

  // Rejoindre une room (simulé)
  private joinRoom() {
    console.log(`Rejoindre la room ${this.roomId} en tant que ${this.isAgent ? 'agent' : 'client'}`);
  }

  // Envoyer un message (simulé)
  sendMessage(message: any) {
    console.log('Message envoyé:', message);
  }

  // Fermer la connexion
  disconnect() {
    console.log('Connexion fermée');
  }
}

// Configuration WebRTC avec serveurs STUN/TURN gratuits
export const webRTCConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ],
  iceCandidatePoolSize: 10
};

// Utilitaires WebRTC
export const webRTCUtils = {
  // Vérifier le support WebRTC
  isSupported(): boolean {
    return !!(
      window.RTCPeerConnection &&
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia
    );
  },

  // Obtenir les capacités du navigateur
  getCapabilities() {
    return {
      webRTC: this.isSupported(),
      getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      getDisplayMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia),
      mobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    };
  },

  // Créer des contraintes optimisées pour le contrôle à distance
  getScreenShareConstraints() {
    return {
      video: {
        width: { ideal: 1920, max: 1920 },
        height: { ideal: 1080, max: 1080 },
        frameRate: { ideal: 30, max: 60 }
      },
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    };
  },

  // Contraintes pour la caméra (agent)
  getCameraConstraints() {
    return {
      video: {
        width: { ideal: 640, max: 1280 },
        height: { ideal: 480, max: 720 },
        frameRate: { ideal: 30 }
      },
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    };
  }
};