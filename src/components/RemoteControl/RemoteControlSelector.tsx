import React, { useState } from 'react';
import { Monitor, Zap, ChevronRight, Star, Clock, Download, X } from 'lucide-react';
import RemoteControlChatModal from './RemoteControlChatModal';

interface RemoteControlSelectorProps {
  ticketId: string;
  clientEmail: string;
  onClose: () => void;
}

const RemoteControlSelector: React.FC<RemoteControlSelectorProps> = ({ 
  ticketId, 
  clientEmail, 
  onClose 
}) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  // Options de contrôle à distance
  const remoteOptions = [
    {
      id: 'rustdesk',
      name: 'RustDesk',
      description: 'Solution open-source de contrôle à distance',
      icon: Monitor,
      color: 'blue',
      features: ['🌐 Open-source', '🔓 Gratuit', '🔄 Multi-plateforme', '🔒 Chiffrement E2E', '🌍 Compatible tous OS', '⏱️ Setup en 2 min'],
      setup: '2 minutes',
      quality: 'Excellente'
    }
  ];

  if (selectedOption === 'rustdesk') {
    return <RemoteControlChatModal ticketId={ticketId} clientEmail={clientEmail} onClose={onClose} />;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-red-50 to-orange-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-r from-red-600 to-orange-500 rounded-lg flex items-center justify-center">
                <Monitor className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Contrôle à Distance</h2>
                <p className="text-gray-600">Ticket #{ticketId.slice(0, 8)} - {clientEmail}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6 text-center">
            <h3 className="text-xl font-bold text-gray-900 mb-2">🚀 Choisissez une Solution</h3>
            <p className="text-gray-600">
              Sélectionnez la méthode de contrôle à distance qui convient le mieux à votre situation
            </p>
          </div>

          {/* Options */}
          <div className="space-y-4">
            {remoteOptions.map((option) => (
              <div
                key={option.id}
                onClick={() => setSelectedOption(option.id)}
                className="relative p-6 rounded-xl border-2 border-gray-200 hover:border-blue-300 cursor-pointer transition-all duration-200 hover:shadow-lg transform hover:scale-[1.01]"
              >
                {option.id === 'rustdesk' && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-4 py-1 rounded-full text-sm font-bold flex items-center space-x-1">
                    <Star className="w-4 h-4" />
                    <span>RECOMMANDÉ</span>
                  </div>
                )}

                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 ${
                      option.color === 'red' ? 'bg-red-600' : 'bg-blue-600'
                    } rounded-xl flex items-center justify-center`}>
                      <option.icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-gray-900">{option.name}</h4>
                      <p className="text-gray-600">{option.description}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-6 h-6 text-gray-400" />
                </div>

                {/* Features */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
                  {option.features.map((feature, index) => (
                    <div 
                      key={index} 
                      className={`bg-opacity-10 rounded-lg px-3 py-2 text-sm font-medium ${
                        option.color === 'red' 
                          ? 'bg-red-100 text-red-800 border border-red-200' 
                          : 'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}
                    >
                      {feature}
                    </div>
                  ))}
                </div>

                {/* Stats */}
                <div className="flex items-center justify-center space-x-8 text-center">
                  <div className="flex items-center space-x-2">
                    <Clock className={`w-5 h-5 ${option.color === 'red' ? 'text-red-600' : 'text-blue-600'}`} />
                    <div>
                      <div className="font-bold text-gray-900">Setup</div>
                      <div className={option.color === 'red' ? 'text-red-700' : 'text-blue-700'}>{option.setup}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Monitor className={`w-5 h-5 ${option.color === 'red' ? 'text-red-600' : 'text-blue-600'}`} />
                    <div>
                      <div className="font-bold text-gray-900">Qualité</div>
                      <div className={option.color === 'red' ? 'text-red-700' : 'text-blue-700'}>{option.quality}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Informations supplémentaires */}
          <div className="mt-6 bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h4 className="font-medium text-gray-900 mb-2">ℹ️ Informations</h4>
            <p className="text-sm text-gray-600">
              Toutes les solutions proposées sont sécurisées et permettent au client de garder le contrôle.
              Les sessions sont temporaires et ne nécessitent pas d'installation permanente.
            </p>
            <p className="text-sm text-gray-600 mt-2">
              Pour plus d'informations sur les différentes solutions, consultez le document 
              <a href="/ALTERNATIVES_CONTROLE_DISTANCE.md" target="_blank" className="text-blue-600 hover:underline ml-1">
                ALTERNATIVES_CONTROLE_DISTANCE.md
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RemoteControlSelector;