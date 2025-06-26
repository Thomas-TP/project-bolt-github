import React, { useState } from 'react';
import { Plus, Bot, X } from 'lucide-react';
import IntelligentSupportSystem from './IntelligentSupportSystem';

interface AITicketCreatorProps {
  onClose?: () => void;
}

const AITicketCreator: React.FC<AITicketCreatorProps> = ({ onClose }) => {
  const [showModal, setShowModal] = useState(false);

  const handleOpenModal = () => {
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    if (onClose) onClose();
  };

  return (
    <>
      <button
        onClick={handleOpenModal}
        className="bg-gradient-to-r from-red-600 to-yellow-500 hover:from-red-700 hover:to-yellow-600 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors shadow-sm"
      >
        <Bot className="w-5 h-5" />
        <span>Créer avec l'IA</span>
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-red-50 to-yellow-50">
              <h2 className="text-xl font-bold text-gray-900">Créer un ticket avec l'assistant IA</h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              <IntelligentSupportSystem />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AITicketCreator;