// Configuration pour RustDesk avec téléchargement direct depuis GitHub

export const RUSTDESK_CONFIG = {
  // URLs de téléchargement
  DOWNLOAD_URLS: {
    windows: 'https://github.com/rustdesk/rustdesk/releases/tag/1.4.0',
    mac: 'https://github.com/rustdesk/rustdesk/releases/tag/1.4.0',
    linux: 'https://github.com/rustdesk/rustdesk/releases/tag/1.4.0',
    android: 'https://play.google.com/store/apps/details?id=com.carriez.flutter_hbb',
    ios: 'https://apps.apple.com/us/app/rustdesk-remote-desktop/id1581225015',
    main: 'https://github.com/rustdesk/rustdesk/releases/tag/1.4.0'
  },
  
  // Configuration par défaut
  DEFAULT_SETTINGS: {
    language: 'fr',
    quality: 'balanced',
    audio: true,
    clipboard: true,
    file_transfer: true
  }
};

// Utilitaires pour RustDesk
export const rustdeskUtils = {
  // Générer un ID de session unique et mémorable
  generateSessionId: (prefix: string = 'GIT') => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 4).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  },

  // Générer un mot de passe sécurisé mais simple
  generatePassword: (length: number = 6) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  // Créer un message de chat optimisé avec instructions claires
  createChatMessage: (connectionId: string, password: string) => {
    return `🚀 **CONTRÔLE À DISTANCE - RUSTDESK**

**📥 TÉLÉCHARGEMENT DIRECT :**
https://github.com/rustdesk/rustdesk/releases/tag/1.4.0

**🔧 INSTRUCTIONS SIMPLES :**
1️⃣ Téléchargez et installez RustDesk
2️⃣ Lancez l'application
3️⃣ Notez votre ID et définissez un mot de passe
4️⃣ Communiquez-moi ces informations ci-dessous

**⚡ AVANTAGES RUSTDESK :**
• Open-source et gratuit
• Sécurisé et chiffré
• Contrôle total pour vous
• Aucun serveur tiers

**🔧 ALTERNATIVE - LIEN UNIVERSEL :**
https://github.com/rustdesk/rustdesk/releases/tag/1.4.0

Merci de me communiquer votre ID et mot de passe RustDesk dès que possible.`;
  },

  // Créer des instructions spécifiques pour mobile
  createMobileInstructions: (sessionId: string, password: string) => {
    return {
      title: "📱 Instructions pour Mobile/Tablette",
      note: "RustDesk fonctionne mieux sur ordinateur, mais voici comment procéder sur mobile :",
      steps: [
        `1. Téléchargez l'app RustDesk depuis votre store d'applications`,
        `2. Ouvrez l'application`,
        `3. Activez le mode "Partage d'écran"`,
        `4. Notez votre ID et définissez un mot de passe`,
        `5. Communiquez-moi ces informations`
      ],
      limitations: [
        "⚠️ Fonctionnalités limitées sur mobile",
        "⚠️ Qualité d'image réduite",
        "⚠️ Contrôle tactile moins précis",
        "💡 Préférez un ordinateur si possible"
      ]
    };
  },

  // Obtenir l'URL de téléchargement selon le système d'exploitation
  getDownloadUrl: () => {
    return 'https://github.com/rustdesk/rustdesk/releases/tag/1.4.0';
  }
};