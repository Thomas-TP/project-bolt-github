import React, { useState } from 'react';
import { Monitor, ExternalLink, Copy, CheckCircle, Download, Smartphone, X } from 'lucide-react';

interface TeamViewerIntegrationProps {
  ticketId: string;
  clientEmail: string;
  onClose: () => void;
}

const TeamViewerIntegration: React.FC<TeamViewerIntegrationProps> = ({ 
  ticketId, 
  clientEmail, 
  onClose 
}) => {
  const [copied, setCopied] = useState(false);

  // Configuration TeamViewer
  const teamViewerConfig = {
    quickSupport: 'https://get.teamviewer.com/qs',
    webClient: 'https://web.teamviewer.com',
    mobileApp: {
      android: 'https://play.google.com/store/apps/details?id=com.teamviewer.quicksupport.market',
      ios: 'https://apps.apple.com/app/teamviewer-quicksupport/id661649585'
    },
    customLink: `https://get.teamviewer.com/qs?utm_source=helpdesk&utm_medium=support&utm_campaign=${ticketId}`
  };

  const copyInstructions = async () => {
    const instructions = `🖥️ SUPPORT TECHNIQUE - ACCÈS À DISTANCE

Bonjour,

Pour vous aider efficacement, j'ai besoin d'accéder temporairement à votre ordinateur.

📥 TÉLÉCHARGEMENT AUTOMATIQUE :
Cliquez sur ce lien : ${teamViewerConfig.customLink}

📋 INSTRUCTIONS SIMPLES :
1. Cliquez sur le lien ci-dessus
2. Téléchargez et lancez TeamViewer QuickSupport
3. Communiquez-moi l'ID affiché (9 chiffres)
4. Je me connecterai pour résoudre votre problème

🔒 SÉCURITÉ :
- Connexion temporaire et sécurisée
- Vous gardez le contrôle total
- Vous pouvez arrêter à tout moment

📱 ALTERNATIVE MOBILE :
Android : ${teamViewerConfig.mobileApp.android}
iOS : ${teamViewerConfig.mobileApp.ios}

Merci !
Support Technique - Ticket #${ticketId.slice(0, 8)}`;

    try {
      await navigator.clipboard.writeText(instructions);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Erreur copie:', err);
    }
  };

  const openTeamViewerWeb = () => {
    window.open(teamViewerConfig.webClient, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Monitor className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">TeamViewer QuickSupport</h2>
                <p className="text-sm text-gray-600">Solution professionnelle de contrôle à distance</p>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Avantages TeamViewer */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">✨ Pourquoi TeamViewer ?</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-blue-800">
              <div>✅ Aucune installation permanente</div>
              <div>✅ Fonctionne derrière les firewalls</div>
              <div>✅ Qualité d'image excellente</div>
              <div>✅ Transfert de fichiers intégré</div>
              <div>✅ Compatible tous systèmes</div>
              <div>✅ Sécurité de niveau bancaire</div>
            </div>
          </div>

          {/* Instructions pour le client */}
          <div className="bg-green-50 rounded-lg p-6">
            <h3 className="font-semibold text-green-900 mb-4 text-lg">
              📋 Instructions pour le Client
            </h3>
            
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-4 border border-green-200">
                <h4 className="font-medium text-green-800 mb-3">🖥️ Pour Ordinateur (Recommandé)</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</div>
                    <span>Cliquez sur : <a href={teamViewerConfig.customLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-medium">{teamViewerConfig.customLink}</a></span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</div>
                    <span>Téléchargez et lancez TeamViewer QuickSupport</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</div>
                    <span>Communiquez-moi l'ID affiché (9 chiffres)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">4</div>
                    <span>Je me connecte et résous votre problème !</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 border border-green-200">
                <h4 className="font-medium text-green-800 mb-3">📱 Pour Mobile/Tablette</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <a 
                    href={teamViewerConfig.mobileApp.android}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 p-3 bg-green-100 rounded-lg hover:bg-green-200 transition-colors"
                  >
                    <Smartphone className="w-5 h-5 text-green-700" />
                    <span className="text-green-800 font-medium">Android</span>
                    <ExternalLink className="w-4 h-4 text-green-600" />
                  </a>
                  <a 
                    href={teamViewerConfig.mobileApp.ios}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 p-3 bg-green-100 rounded-lg hover:bg-green-200 transition-colors"
                  >
                    <Smartphone className="w-5 h-5 text-green-700" />
                    <span className="text-green-800 font-medium">iOS</span>
                    <ExternalLink className="w-4 h-4 text-green-600" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href={teamViewerConfig.customLink}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg flex items-center justify-center space-x-2 transition-colors"
            >
              <Download className="w-5 h-5" />
              <span>Lien Client</span>
            </a>

            <button
              onClick={openTeamViewerWeb}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg flex items-center justify-center space-x-2 transition-colors"
            >
              <Monitor className="w-5 h-5" />
              <span>Ouvrir Agent</span>
            </button>

            <button
              onClick={copyInstructions}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg flex items-center justify-center space-x-2 transition-colors"
            >
              {copied ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              <span>{copied ? 'Copié !' : 'Copier Instructions'}</span>
            </button>
          </div>

          {/* Informations de sécurité */}
          <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
            <h4 className="font-medium text-yellow-900 mb-2">🔒 Sécurité et Confidentialité</h4>
            <div className="text-sm text-yellow-800 space-y-1">
              <div>• Connexion chiffrée AES 256 bits</div>
              <div>• Aucune donnée stockée sur les serveurs</div>
              <div>• Le client garde le contrôle total</div>
              <div>• Session temporaire uniquement</div>
              <div>• Conforme RGPD et certifié ISO 27001</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamViewerIntegration;