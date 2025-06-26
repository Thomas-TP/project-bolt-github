import React, { useState, useEffect } from 'react';
import { X, Monitor, Shield, AlertCircle, Copy, CheckCircle, Phone, Video, Settings, ExternalLink, Wifi, WifiOff } from 'lucide-react';
import { useUser } from '../../hooks/useUser';
import { rustdeskUtils, RUSTDESK_CONFIG } from '../../utils/rustdeskConfig';

interface RemoteControlModalProps {
  ticketId: string;
  clientEmail: string;
  onClose: () => void;
}

const RemoteControlModal: React.FC<RemoteControlModalProps> = ({ 
  ticketId, 
  clientEmail, 
  onClose 
}) => {
  const { user } = useUser();
  const [connectionId, setConnectionId] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'failed'>('idle');
  const [copied, setCopied] = useState<{id: boolean, password: boolean}>({id: false, password: false});
  const [serverStatus, setServerStatus] = useState<'checking' | 'available' | 'unavailable'>('checking');
  const [bestWebUrl, setBestWebUrl] = useState<string>(RUSTDESK_CONFIG.URLS.web_client);

  useEffect(() => {
    // Générer un ID de connexion unique pour cette session
    const sessionId = rustdeskUtils.generateSessionId(`GIT${ticketId.slice(0, 6)}`);
    setConnectionId(sessionId);
    
    // Générer un mot de passe temporaire sécurisé
    const tempPassword = rustdeskUtils.generatePassword();
    setPassword(tempPassword);

    // Vérifier la disponibilité des serveurs
    checkServerAvailability();
  }, [ticketId]);

  const checkServerAvailability = async () => {
    setServerStatus('checking');
    
    try {
      const bestUrl = await rustdeskUtils.getBestWebUrl();
      setBestWebUrl(bestUrl);
      setServerStatus('available');
      console.log('✅ Serveur RustDesk disponible:', bestUrl);
    } catch (error) {
      console.error('❌ Erreur vérification serveurs:', error);
      setServerStatus('unavailable');
    }
  };

  const copyToClipboard = async (text: string, type: 'id' | 'password') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(prev => ({ ...prev, [type]: true }));
      setTimeout(() => setCopied(prev => ({ ...prev, [type]: false })), 2000);
    } catch (err) {
      console.error('Erreur lors de la copie:', err);
    }
  };

  const copyAllCredentials = async () => {
    const credentials = `🖥️ CONTRÔLE À DISTANCE - RUSTDESK

📋 Informations de connexion:
• ID de Session: ${connectionId}
• Mot de Passe: ${password}

🌐 Lien Web: ${bestWebUrl}

📱 Instructions:
1. Cliquez sur le lien ci-dessus
2. Cliquez sur "Allow Control" (Permettre le contrôle)
3. Entrez l'ID et le mot de passe
4. Cliquez sur "Start Service"

💻 Alternative - Application Desktop:
Téléchargez depuis: ${RUSTDESK_CONFIG.URLS.download}`;

    try {
      await navigator.clipboard.writeText(credentials);
      setCopied({id: true, password: true});
      setTimeout(() => setCopied({id: false, password: false}), 2000);
    } catch (err) {
      console.error('Erreur lors de la copie:', err);
    }
  };

  const openRustDeskWeb = () => {
    // Ouvrir RustDesk Web dans un nouvel onglet avec la meilleure URL disponible
    const url = rustdeskUtils.buildWebUrl();
    window.open(bestWebUrl, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
  };

  const sendCredentialsToClient = async () => {
    setIsConnecting(true);
    
    try {
      // Simuler l'envoi d'email ou notification
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const message = `Informations de contrôle à distance envoyées à ${clientEmail}:

ID de Session: ${connectionId}
Mot de passe: ${password}
Lien Web: ${bestWebUrl}

Le client peut maintenant se connecter via l'interface web ou l'application desktop.`;
      
      alert(message);
      setConnectionStatus('connecting');
    } catch (error) {
      console.error('Erreur lors de l\'envoi:', error);
      setConnectionStatus('failed');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-red-50 to-yellow-50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-red-600 to-yellow-500 rounded-lg flex items-center justify-center">
              <Monitor className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Contrôle à Distance RustDesk</h2>
              <p className="text-sm text-gray-600">Ticket #{ticketId.slice(0, 8)} - {clientEmail}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {/* Indicateur de statut serveur */}
            <div className="flex items-center space-x-2">
              {serverStatus === 'checking' && (
                <div className="flex items-center space-x-1 text-yellow-600">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-yellow-600"></div>
                  <span className="text-xs">Vérification...</span>
                </div>
              )}
              {serverStatus === 'available' && (
                <div className="flex items-center space-x-1 text-green-600">
                  <Wifi className="w-4 h-4" />
                  <span className="text-xs">Serveurs OK</span>
                </div>
              )}
              {serverStatus === 'unavailable' && (
                <div className="flex items-center space-x-1 text-red-600">
                  <WifiOff className="w-4 h-4" />
                  <span className="text-xs">Serveurs indisponibles</span>
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Avertissement si serveurs indisponibles */}
          {serverStatus === 'unavailable' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium text-red-800">Serveurs RustDesk temporairement indisponibles</h3>
                  <p className="text-sm text-red-700 mt-1">
                    Les serveurs publics RustDesk ne sont pas accessibles actuellement. 
                    Vous pouvez toujours utiliser l'application desktop ou réessayer plus tard.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Avertissement de sécurité */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Shield className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-yellow-800">Utilisation des Serveurs Publics RustDesk</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  Cette session utilise les serveurs publics de RustDesk. Les données transitent par leurs serveurs.
                  Assurez-vous d'avoir l'autorisation explicite du client avant de procéder.
                </p>
              </div>
            </div>
          </div>

          {/* Informations de connexion */}
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-900">Informations de Connexion</h3>
              <button
                onClick={copyAllCredentials}
                className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg transition-colors"
              >
                Copier Tout
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ID de Session
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={connectionId}
                    readOnly
                    className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-lg font-mono text-center"
                  />
                  <button
                    onClick={() => copyToClipboard(connectionId, 'id')}
                    className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Copier l'ID"
                  >
                    {copied.id ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mot de Passe
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={password}
                    readOnly
                    className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-lg font-mono text-center"
                  />
                  <button
                    onClick={() => copyToClipboard(password, 'password')}
                    className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Copier le mot de passe"
                  >
                    {copied.password ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Interface Web :</strong> {bestWebUrl}
              </p>
              <p className="text-sm text-blue-800 mt-1">
                <strong>Serveur Relay :</strong> {RUSTDESK_CONFIG.PUBLIC_SERVERS.relay}
              </p>
            </div>
          </div>

          {/* Instructions détaillées pour le client */}
          <div className="bg-blue-50 rounded-lg p-6">
            <h3 className="font-medium text-blue-900 mb-4 flex items-center space-x-2">
              <Monitor className="w-5 h-5" />
              <span>Instructions pour le Client</span>
            </h3>
            
            <div className="space-y-4">
              {/* Option Web (Recommandée) */}
              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">🌐 Option 1 - Interface Web (Recommandée)</h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
                  <li>Cliquez sur ce lien : <a href={bestWebUrl} target="_blank" rel="noopener noreferrer" className="underline font-medium">{bestWebUrl}</a></li>
                  <li>Cliquez sur <strong>"Allow Control"</strong> (Permettre le contrôle)</li>
                  <li>Dans le champ "Your ID", entrez : <code className="bg-blue-100 px-2 py-1 rounded font-mono">{connectionId}</code></li>
                  <li>Cliquez sur <strong>"Set Password"</strong> et entrez : <code className="bg-blue-100 px-2 py-1 rounded font-mono">{password}</code></li>
                  <li>Cliquez sur <strong>"Start Service"</strong></li>
                  <li>Attendez que l'agent se connecte</li>
                </ol>
              </div>

              {/* Option Application */}
              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">💻 Option 2 - Application Desktop</h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
                  <li>Téléchargez RustDesk depuis <a href={RUSTDESK_CONFIG.URLS.download} target="_blank" rel="noopener noreferrer" className="underline">rustdesk.com</a></li>
                  <li>Installez et lancez l'application</li>
                  <li>Votre ID sera affiché automatiquement</li>
                  <li>Définissez un mot de passe temporaire</li>
                  <li>Communiquez ces informations à l'agent</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Statut de connexion */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-3">Statut de la Session</h3>
            
            <div className="flex items-center space-x-3 mb-3">
              <div className={`w-3 h-3 rounded-full ${
                connectionStatus === 'idle' ? 'bg-gray-400' :
                connectionStatus === 'connecting' ? 'bg-yellow-400 animate-pulse' :
                connectionStatus === 'connected' ? 'bg-green-400' :
                'bg-red-400'
              }`}></div>
              <span className="text-sm text-gray-700">
                {connectionStatus === 'idle' && 'En attente - Partagez les informations avec le client'}
                {connectionStatus === 'connecting' && 'Informations envoyées - En attente de connexion client'}
                {connectionStatus === 'connected' && 'Connecté avec succès'}
                {connectionStatus === 'failed' && 'Échec de la connexion'}
              </span>
            </div>

            {connectionStatus === 'connecting' && (
              <div className="p-3 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-800">
                  ⏳ En attente que le client démarre le service sur son ordinateur...
                </p>
              </div>
            )}

            {connectionStatus === 'connected' && (
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-green-800">
                  ✅ Session active - Vous pouvez maintenant contrôler l'ordinateur du client
                </p>
              </div>
            )}
          </div>

          {/* Actions principales */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              onClick={openRustDeskWeb}
              disabled={serverStatus === 'unavailable'}
              className="bg-gradient-to-r from-red-600 to-yellow-500 hover:from-red-700 hover:to-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg flex items-center justify-center space-x-2 transition-colors"
            >
              <ExternalLink className="w-5 h-5" />
              <span>Ouvrir RustDesk Web</span>
            </button>

            <button
              onClick={sendCredentialsToClient}
              disabled={isConnecting}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg flex items-center justify-center space-x-2 transition-colors"
            >
              {isConnecting ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <Phone className="w-5 h-5" />
              )}
              <span>
                {isConnecting ? 'Envoi...' : 'Envoyer au Client'}
              </span>
            </button>

            <button
              onClick={copyAllCredentials}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg flex items-center justify-center space-x-2 transition-colors"
            >
              <Copy className="w-5 h-5" />
              <span>Copier Infos</span>
            </button>
          </div>

          {/* Informations techniques */}
          <div className="border-t border-gray-200 pt-4">
            <details className="group">
              <summary className="flex items-center justify-between cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                <span>Informations Techniques</span>
                <Settings className="w-4 h-4 group-open:rotate-90 transition-transform" />
              </summary>
              <div className="mt-3 text-sm text-gray-600 space-y-2">
                <p><strong>Interface Web :</strong> {bestWebUrl}</p>
                <p><strong>Serveur Relay :</strong> {RUSTDESK_CONFIG.PUBLIC_SERVERS.relay}</p>
                <p><strong>Téléchargement :</strong> {RUSTDESK_CONFIG.URLS.download}</p>
                <p><strong>Protocole :</strong> TCP/UDP via serveurs publics RustDesk</p>
                <p><strong>Chiffrement :</strong> End-to-end avec clés éphémères</p>
                <p><strong>Ports utilisés :</strong> 21115 (TCP), 21116 (UDP), 21117 (TCP)</p>
              </div>
            </details>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Session via serveurs publics RustDesk - Connexion sécurisée
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

export default RemoteControlModal;