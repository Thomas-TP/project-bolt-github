import React, { useState } from 'react';
import { Monitor, Shield } from 'lucide-react';
import { useUser } from '../../hooks/useUser';
import RemoteControlSelector from './RemoteControlSelector';

interface RemoteControlButtonProps {
  ticketId: string;
  clientEmail: string;
  disabled?: boolean;
}

const RemoteControlButton: React.FC<RemoteControlButtonProps> = ({ 
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
        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-all shadow-md hover:shadow-lg transform hover:scale-105"
        title="Contrôle à distance - Plusieurs options disponibles"
      >
        <Monitor className="w-4 h-4" />
        <span className="font-medium">Contrôle à Distance</span>
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

export default RemoteControlButton;