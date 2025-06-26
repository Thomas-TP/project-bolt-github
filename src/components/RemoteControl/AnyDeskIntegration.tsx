import React, { useState } from 'react';
import { Monitor, ExternalLink, Copy, CheckCircle, Download, Zap, X } from 'lucide-react';

interface AnyDeskIntegrationProps {
  ticketId: string;
  clientEmail: string;
  onClose: () => void;
}

const AnyDeskIntegration: React.FC<AnyDeskIntegrationProps> = ({ 
  ticketId, 
  clientEmail, 
  onClose 
}) => {
  const [copied, setCopied] = useState(false);

  const anyDeskConfig = {
    download: 'https://anydesk.com/en/downloads',
    webClient: 'https://my.anydesk.com',
    directDownload: 'https://download.anydesk.com/AnyDesk.exe',
    customLink: `https://anydesk.com/en/downloads?utm_source=helpdesk&utm_campaign=${ticketId}`
  };

  const copyInstructions = async () => {
    const instructions = `🚀 SUPPORT TECHNIQUE - ANYDESK

Bonjour,

Pour résoudre rapidement votre problème, j'utilise AnyDesk (solution ultra-rapide).

⚡ TÉLÉCHARGEMENT DIRECT :
${anyDeskConfig.directDownload}

📋 ÉTAPES SIMPLES :
1. Téléchargez AnyDesk (2MB seulement)
2. Lancez le fichier (aucune installation requise)
3. Donnez-moi l'ID AnyDesk affiché (9 chiffres)
4. Acceptez ma demande de connexion
5. Je résous votre problème en quelques minutes !

⚡ AVANTAGES :
- Ultra-rapide (60 FPS)
- Très léger (2MB)
- Aucune installation
- Sécurisé et temporaire

📞 Ticket #${ticketId.slice(0, 8)}
Support Technique`;

    try {
      await navigator.clipboard.writeText(instructions);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Erreur copie:', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">AnyDesk - Ultra Rapide</h2>
                <p className="text-sm text-gray-600">Solution légère et performante</p>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Avantages AnyDesk */}
          <div className="bg-red-50 rounded-lg p-4">
            <h3 className="font-semibold text-red-900 mb-2">⚡ Pourquoi AnyDesk ?</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-red-800">
              <div>🚀 Ultra-rapide (60 FPS)</div>
              <div>📦 Très léger (2MB seulement)</div>
              <div>🔧 Aucune installation requise</div>
              <div>🌐 Fonctionne partout</div>
              <div>🔒 Sécurisé par défaut</div>
              <div>⚡ Connexion instantanée</div>
            </div>
          </div>

          {/* Instructions simplifiées */}
          <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-lg p-6 border-2 border-red-200">
            <h3 className="font-bold text-red-900 mb-4 text-lg flex items-center space-x-2">
              <Zap className="w-6 h-6" />
              <span>🚀 Instructions Ultra-Rapides</span>
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-3 bg-white rounded-lg p-3 border border-red-200">
                <div className="w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center font-bold">1</div>
                <div>
                  <div className="font-medium text-red-900">Téléchargement Direct</div>
                  <a href={anyDeskConfig.directDownload} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-sm">
                    {anyDeskConfig.directDownload}
                  </a>
                </div>
              </div>

              <div className="flex items-center space-x-3 bg-white rounded-lg p-3 border border-red-200">
                <div className="w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center font-bold">2</div>
                <div>
                  <div className="font-medium text-red-900">Lancer AnyDesk</div>
                  <div className="text-sm text-red-700">Double-cliquez sur le fichier téléchargé</div>
                </div>
              </div>

              <div className="flex items-center space-x-3 bg-white rounded-lg p-3 border border-red-200">
                <div className="w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center font-bold">3</div>
                <div>
                  <div className="font-medium text-red-900">Communiquer l'ID</div>
                  <div className="text-sm text-red-700">Donnez-moi les 9 chiffres affichés</div>
                </div>
              </div>

              <div className="flex items-center space-x-3 bg-white rounded-lg p-3 border border-red-200">
                <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">✓</div>
                <div>
                  <div className="font-medium text-green-900">Connexion Établie</div>
                  <div className="text-sm text-green-700">Je résous votre problème !</div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions principales */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href={anyDeskConfig.directDownload}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg flex items-center justify-center space-x-2 transition-colors font-semibold"
            >
              <Download className="w-5 h-5" />
              <span>Télécharger Client</span>
            </a>

            <a
              href={anyDeskConfig.webClient}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg flex items-center justify-center space-x-2 transition-colors"
            >
              <Monitor className="w-5 h-5" />
              <span>Ouvrir Agent</span>
            </a>

            <button
              onClick={copyInstructions}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg flex items-center justify-center space-x-2 transition-colors"
            >
              {copied ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              <span>{copied ? 'Copié !' : 'Copier Instructions'}</span>
            </button>
          </div>

          {/* Comparaison rapide */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">📊 Comparaison Rapide</h4>
            <div className="grid grid-cols-3 gap-4 text-center text-sm">
              <div>
                <div className="font-semibold text-red-600">AnyDesk</div>
                <div className="text-gray-600">2MB • 60 FPS</div>
              </div>
              <div>
                <div className="font-semibold text-blue-600">TeamViewer</div>
                <div className="text-gray-600">50MB • 30 FPS</div>
              </div>
              <div>
                <div className="font-semibold text-purple-600">RustDesk</div>
                <div className="text-gray-600">Web • Variable</div>
              </div>
            </div>
          </div>

          {/* Note de sécurité */}
          <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
            <h4 className="font-medium text-yellow-900 mb-2">🔒 Sécurité</h4>
            <div className="text-sm text-yellow-800">
              AnyDesk utilise un chiffrement TLS 1.2 et RSA 2048. La connexion est temporaire et vous gardez le contrôle total.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnyDeskIntegration;