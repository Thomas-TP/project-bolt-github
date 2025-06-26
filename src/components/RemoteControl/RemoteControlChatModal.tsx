import React, { useState, useEffect } from 'react';
import { X, Monitor, Zap, ExternalLink, Copy, CheckCircle, Send, MessageSquare, AlertCircle, Rocket, Wifi, WifiOff, Users, ArrowRight, Eye, Settings, Smartphone, Download } from 'lucide-react';
import { useUser } from '../../hooks/useUser';
import { messageService } from '../../services/messageService';

interface RemoteControlChatModalProps {
  ticketId: string;
  clientEmail: string;
  onClose: () => void;
}

const RemoteControlChatModal: React.FC<RemoteControlChatModalProps> = ({ 
  ticketId, 
  clientEmail, 
  onClose 
}) => {
  const { user } = useUser();
  const [connectionId, setConnectionId] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isLaunching, setIsLaunching] = useState(false);
  const [step, setStep] = useState<'prepare' | 'launching' | 'sent' | 'ready'>('prepare');
  const [copied, setCopied] = useState<{all: boolean, id: boolean, password: boolean}>({all: false, id: false, password: false});
  const [clientIdInput, setClientIdInput] = useState<string>('');
  const [clientPasswordInput, setClientPasswordInput] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    // Générer automatiquement un ID et mot de passe pour l'agent
    const sessionId = generateSessionId('GIT');
    const tempPassword = generatePassword(6);
    
    setConnectionId(sessionId);
    setPassword(tempPassword);
  }, [ticketId]);

  const generateSessionId = (prefix: string): string => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 4).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  };

  const generatePassword = (length: number): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const copyToClipboard = async (text: string, type: 'all' | 'id' | 'password') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(prev => ({ ...prev, [type]: true }));
      setTimeout(() => setCopied(prev => ({ ...prev, [type]: false })), 2000);
    } catch (err) {
      console.error('Erreur lors de la copie:', err);
    }
  };

  const launchRemoteControl = async () => {
    setIsLaunching(true);
    setStep('launching');

    try {
      // Créer le message de chat optimisé avec instructions claires
      const chatMessage = `🚀 **CONTRÔLE À DISTANCE - RUSTDESK**

**📥 TÉLÉCHARGEMENT DIRECT :**
https://github.com/rustdesk/rustdesk/releases/tag/1.4.0

**📋 INSTRUCTIONS SIMPLES :**
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

**📞 Ticket #${ticketId.slice(0, 8)}**
Merci de me communiquer votre ID et mot de passe RustDesk dès que possible.`;

      // Envoyer le message
      await messageService.createMessage({
        ticket_id: ticketId,
        user_id: user!.id,
        content: chatMessage,
        is_internal: false,
        attachments: null
      });

      setStep('sent');
      
      // Passer automatiquement à l'étape "prêt"
      setTimeout(() => {
        setStep('ready');
      }, 3000);

    } catch (error) {
      console.error('Erreur lors du lancement:', error);
      alert('Erreur lors du lancement du contrôle à distance');
    } finally {
      setIsLaunching(false);
    }
  };

  const openRustDeskDownload = () => {
    window.open('https://github.com/rustdesk/rustdesk/releases/tag/1.4.0', '_blank');
  };

  const sendInstructions = async (type: 'simple' | 'detailed' | 'mobile') => {
    let message = '';
    
    switch (type) {
      case 'simple':
        message = `🚀 **CONTRÔLE À DISTANCE - INSTRUCTIONS RAPIDES**

**📥 TÉLÉCHARGEMENT :**
https://github.com/rustdesk/rustdesk/releases/tag/1.4.0

**📋 ÉTAPES SIMPLES :**
1. Téléchargez et installez RustDesk
2. Lancez l'application
3. Notez votre ID et définissez un mot de passe
4. Communiquez-moi ces informations

**✅ Merci de me communiquer ces informations dès que possible !**`;
        break;
        
      case 'detailed':
        message = `🚀 **CONTRÔLE À DISTANCE RUSTDESK - INSTRUCTIONS COMPLÈTES**

**📥 TÉLÉCHARGEMENT :**
https://github.com/rustdesk/rustdesk/releases/tag/1.4.0

**📋 ÉTAPES DÉTAILLÉES :**
1. Téléchargez l'application correspondant à votre système
2. Installez et lancez RustDesk
3. Dans la fenêtre principale, vous verrez votre ID (12 caractères)
4. Cliquez sur "Définir un mot de passe" et créez un mot de passe temporaire
5. Communiquez-moi ces deux informations par message

**🔒 SÉCURITÉ :**
• Votre ID est unique à votre ordinateur
• Le mot de passe est temporaire et peut être changé
• Vous gardez le contrôle total et pouvez arrêter à tout moment
• Toutes les données sont chiffrées de bout en bout

**⚙️ CONFIGURATION AVANCÉE (OPTIONNEL) :**
• Vous pouvez configurer les options d'accès dans Paramètres
• Possibilité de limiter l'accès à certaines fonctionnalités
• Option pour enregistrer la session si nécessaire

**🆘 BESOIN D'AIDE ?**
Si vous rencontrez des difficultés, n'hésitez pas à me le faire savoir.

**📞 Ticket #${ticketId.slice(0, 8)}**
Merci de votre collaboration !`;
        break;
        
      case 'mobile':
        message = `📱 **CONTRÔLE À DISTANCE RUSTDESK - MOBILE**

**⚠️ NOTE IMPORTANTE :**
Le contrôle à distance fonctionne mieux sur ordinateur. Sur mobile, seul le partage d'écran est possible (pas de contrôle).

**📥 TÉLÉCHARGEMENT :**
Android: https://play.google.com/store/apps/details?id=com.carriez.flutter_hbb
iOS: https://apps.apple.com/app/rustdesk-remote-desktop/id1581225015

**📋 ÉTAPES :**
1. Installez l'application RustDesk depuis votre store
2. Ouvrez l'application
3. Acceptez les permissions nécessaires
4. Cliquez sur "Partager l'écran"
5. Notez l'ID affiché et définissez un mot de passe
6. Communiquez-moi ces informations

**⚠️ LIMITATIONS :**
• Sur mobile, je pourrai voir votre écran mais pas le contrôler
• La qualité peut être réduite sur les connexions mobiles
• Certaines fonctionnalités avancées ne sont pas disponibles

**📋 INFORMATIONS À ME COMMUNIQUER :**
• ID RustDesk
• Mot de passe temporaire`;
        break;
    }

    try {
      await messageService.createMessage({
        ticket_id: ticketId,
        user_id: user!.id,
        content: message,
        is_internal: false,
        attachments: null
      });
      
      alert('✅ Instructions envoyées dans le chat !');
    } catch (error) {
      console.error('Erreur envoi instructions:', error);
      alert('❌ Erreur lors de l\'envoi des instructions');
    }
  };

  const handleConnectToClient = () => {
    if (!clientIdInput.trim() || !clientPasswordInput.trim()) {
      alert('Veuillez entrer l\'ID et le mot de passe du client');
      return;
    }

    // Ouvrir RustDesk avec les informations du client
    window.open('https://github.com/rustdesk/rustdesk/releases/tag/1.4.0', '_blank');
    
    // Afficher un message de confirmation
    alert(`✅ Téléchargez et installez RustDesk, puis utilisez ces informations pour vous connecter:
    
ID: ${clientIdInput}
Mot de passe: ${clientPasswordInput}`);
  };

  const renderStep = () => {
    switch (step) {
      case 'prepare':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Monitor className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Contrôle à Distance RustDesk</h3>
              <p className="text-gray-600 text-lg">
                Téléchargement et installation requis
              </p>
            </div>

            {/* Téléchargement RustDesk */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border-2 border-blue-200">
              <h4 className="font-bold text-blue-900 mb-4 text-lg flex items-center space-x-2">
                <Download className="w-6 h-6" />
                <span>Téléchargement RustDesk</span>
              </h4>
              
              <div className="space-y-4">
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <h5 className="font-medium text-blue-800 mb-2">1. Téléchargez RustDesk</h5>
                  <p className="text-blue-700 mb-3">
                    RustDesk est une application de contrôle à distance open-source et gratuite.
                  </p>
                  <button
                    onClick={openRustDeskDownload}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors mx-auto"
                  >
                    <Download className="w-4 h-4" />
                    <span>Télécharger RustDesk</span>
                  </button>
                </div>

                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <h5 className="font-medium text-blue-800 mb-2">2. Demandez au client de faire de même</h5>
                  <p className="text-blue-700 mb-3">
                    Envoyez les instructions au client pour qu'il télécharge et installe RustDesk.
                  </p>
                  <button
                    onClick={launchRemoteControl}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors mx-auto"
                  >
                    <Send className="w-4 h-4" />
                    <span>Envoyer les instructions au client</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Informations de connexion */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h4 className="font-medium text-gray-900 mb-4">Informations de connexion du client</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ID RustDesk du client
                  </label>
                  <input
                    type="text"
                    value={clientIdInput}
                    onChange={(e) => setClientIdInput(e.target.value)}
                    placeholder="Entrez l'ID communiqué par le client"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mot de passe
                  </label>
                  <input
                    type="text"
                    value={clientPasswordInput}
                    onChange={(e) => setClientPasswordInput(e.target.value)}
                    placeholder="Entrez le mot de passe communiqué par le client"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <button
                  onClick={handleConnectToClient}
                  disabled={!clientIdInput.trim() || !clientPasswordInput.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2 transition-colors"
                >
                  <Monitor className="w-4 h-4" />
                  <span>Se connecter au client</span>
                </button>
              </div>
            </div>

            {/* Actions alternatives */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                onClick={() => sendInstructions('simple')}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg flex items-center justify-center space-x-2 transition-colors"
              >
                <Send className="w-4 h-4" />
                <span>Instructions Rapides</span>
              </button>

              <button
                onClick={() => sendInstructions('detailed')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg flex items-center justify-center space-x-2 transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Instructions Détaillées</span>
              </button>

              <button
                onClick={() => sendInstructions('mobile')}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg flex items-center justify-center space-x-2 transition-colors"
              >
                <Smartphone className="w-4 h-4" />
                <span>Instructions Mobile</span>
              </button>
            </div>

            {/* Guide visuel */}
            <div className="bg-gray-50 rounded-lg p-6">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center justify-between w-full text-left"
              >
                <h4 className="font-semibold text-gray-900">📋 Guide Étape par Étape</h4>
                <ArrowRight className={`w-5 h-5 transition-transform ${showAdvanced ? 'rotate-90' : ''}`} />
              </button>
              
              {showAdvanced && (
                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Guide Client */}
                    <div className="bg-white rounded-lg p-4 border">
                      <h5 className="font-semibold text-green-800 mb-3 flex items-center space-x-2">
                        <Monitor className="w-5 h-5" />
                        <span>🖥️ Pour le Client</span>
                      </h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</div>
                          <span>Télécharger RustDesk</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</div>
                          <span>Installer et lancer l'application</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</div>
                          <span>Noter l'ID affiché</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">4</div>
                          <span>Définir un mot de passe</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">5</div>
                          <span>Communiquer ces informations</span>
                        </div>
                      </div>
                    </div>

                    {/* Guide Agent */}
                    <div className="bg-white rounded-lg p-4 border">
                      <h5 className="font-semibold text-blue-800 mb-3 flex items-center space-x-2">
                        <Users className="w-5 h-5" />
                        <span>🎮 Pour l'Agent (Vous)</span>
                      </h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</div>
                          <span>Télécharger RustDesk</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</div>
                          <span>Installer et lancer l'application</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</div>
                          <span>Saisir l'ID du client</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">4</div>
                          <span>Saisir le mot de passe</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">5</div>
                          <span>Contrôler l'écran client</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 'launching':
        return (
          <div className="text-center space-y-6">
            <div className="w-24 h-24 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto">
              <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-white"></div>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">🚀 Lancement en cours...</h3>
              <p className="text-gray-600 text-lg">
                Envoi des instructions au client
              </p>
            </div>
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="animate-pulse w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-blue-800">Préparation des instructions...</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="animate-pulse w-3 h-3 bg-purple-500 rounded-full"></div>
                  <span className="text-purple-800">Envoi du message au client...</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="animate-pulse w-3 h-3 bg-pink-500 rounded-full"></div>
                  <span className="text-pink-800">Finalisation...</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'sent':
        return (
          <div className="text-center space-y-6">
            <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">✅ Instructions Envoyées !</h3>
              <p className="text-gray-600 text-lg">
                Le client a reçu les instructions détaillées
              </p>
            </div>
            <div className="bg-green-50 rounded-lg p-6 border border-green-200">
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-green-800">Instructions de téléchargement envoyées</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-green-800">Instructions complètes envoyées à {clientEmail}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-green-800">Le client va vous communiquer son ID et mot de passe</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'ready':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-24 h-24 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-12 h-12 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">🎉 Système Prêt !</h3>
              <p className="text-gray-600 text-lg">
                Instructions envoyées, en attente des informations du client
              </p>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6 border-2 border-green-200">
              <h4 className="font-bold text-green-900 mb-4 text-lg">📋 Prochaines étapes :</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-lg p-4 border border-green-200">
                  <h5 className="font-semibold text-green-800 mb-2 flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span>🎮 Agent (Vous)</span>
                  </h5>
                  <div className="space-y-1 text-sm text-green-700">
                    <div>✅ Instructions envoyées</div>
                    <div>⏳ Attente des informations client</div>
                    <div>🔧 Téléchargez RustDesk si ce n'est pas déjà fait</div>
                    <div>🔗 Prêt à saisir l'ID et mot de passe</div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <h5 className="font-semibold text-blue-800 mb-2 flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                    <span>🖥️ Client</span>
                  </h5>
                  <div className="space-y-1 text-sm text-blue-700">
                    <div>📱 Instructions reçues via chat</div>
                    <div>🔧 Téléchargement et installation en cours</div>
                    <div>⚡ Récupération de l'ID et mot de passe</div>
                    <div>🎯 Communication des informations imminente</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h4 className="font-medium text-gray-900 mb-4">Informations de connexion du client</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ID RustDesk du client
                  </label>
                  <input
                    type="text"
                    value={clientIdInput}
                    onChange={(e) => setClientIdInput(e.target.value)}
                    placeholder="Entrez l'ID communiqué par le client"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mot de passe
                  </label>
                  <input
                    type="text"
                    value={clientPasswordInput}
                    onChange={(e) => setClientPasswordInput(e.target.value)}
                    placeholder="Entrez le mot de passe communiqué par le client"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <button
                  onClick={handleConnectToClient}
                  disabled={!clientIdInput.trim() || !clientPasswordInput.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2 transition-colors"
                >
                  <Monitor className="w-4 h-4" />
                  <span>Se connecter au client</span>
                </button>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={openRustDeskDownload}
                className="flex-1 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white px-6 py-3 rounded-lg flex items-center justify-center space-x-2 transition-all font-semibold"
              >
                <Download className="w-5 h-5" />
                <span>Télécharger RustDesk</span>
              </button>
              
              <button
                onClick={() => setStep('prepare')}
                className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Nouvelle Session
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
              <Monitor className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">🚀 Contrôle à Distance RustDesk</h2>
              <p className="text-sm text-gray-600">Ticket #{ticketId.slice(0, 8)} - {clientEmail}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {renderStep()}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50 rounded-b-xl">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              🌐 RustDesk - Solution open-source de contrôle à distance
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RemoteControlChatModal;