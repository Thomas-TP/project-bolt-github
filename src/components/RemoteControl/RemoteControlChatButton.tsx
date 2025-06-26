import React, { useState } from 'react';
import { Monitor, Zap } from 'lucide-react';
import { useUser } from '../../hooks/useUser';
import RemoteControlSelector from './RemoteControlSelector';

interface RemoteControlChatButtonProps {
  ticketId: string;
  clientEmail: string;
  disabled?: boolean;
}

const RemoteControlChatButton: React.FC<RemoteControlChatButtonProps> = ({ 
  ticketId, 
  clientEmail, 
  disabled = false 
}) => {
  const { user } = useUser();
  const [showSelector, setShowSelector] = useState(false);

  // Seuls les agents et admins peuvent utiliser le contrôle à distance
  if (!user || (user.role !== 'agent' && user.role !== 'admin')) {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setShowSelector(true)}
        disabled={disabled}
        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3 py-1 rounded-lg flex items-center space-x-1 transition-all text-sm shadow-sm hover:shadow-md transform hover:scale-105"
        title="Contrôle à distance - Plusieurs solutions disponibles"
      >
        <Zap className="w-3 h-3" />
        <Monitor className="w-3 h-3" />
        <span className="font-medium">Contrôle</span>
      </button>

      {showSelector && (
        <RemoteControlSelector
          ticketId={ticketId}
          clientEmail={clientEmail}
          onClose={() => setShowSelector(false)}
        />
      )}
    </>
  );
};

export default RemoteControlChatButton;