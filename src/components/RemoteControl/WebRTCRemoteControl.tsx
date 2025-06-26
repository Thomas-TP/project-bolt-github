import React, { useState, useEffect, useRef } from 'react';
import { Monitor, Video, Mic, MicOff, VideoOff, Phone, PhoneOff, Settings, Maximize, Minimize, RotateCcw, Wifi, WifiOff, Users, MessageSquare, X } from 'lucide-react';

interface WebRTCRemoteControlProps {
  ticketId: string;
  isAgent: boolean;
  onClose: () => void;
}

const WebRTCRemoteControl: React.FC<WebRTCRemoteControlProps> = ({ 
  ticketId, 
  isAgent, 
  onClose 
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'poor' | 'unknown'>('unknown');
  const [error, setError] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<Array<{id: string, message: string, sender: string, timestamp: Date}>>([]);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    initializeWebRTC();
    return () => {
      cleanup();
    };
  }, []);

  const initializeWebRTC = async () => {
    try {
      console.log('🚀 Initialisation WebRTC...');
      
      // Pour la démo, on simule une connexion
      setIsConnecting(true);
      
      // Simuler l'initialisation
      setTimeout(() => {
        setIsConnecting(false);
        setIsConnected(true);
        setConnectionQuality('good');
      }, 2000);
      
    } catch (error) {
      console.error('❌ Erreur initialisation WebRTC:', error);
      setError(`Erreur d'initialisation: ${error.message}`);
    }
  };

  const toggleAudio = () => {
    setAudioEnabled(!audioEnabled);
  };

  const toggleVideo = () => {
    setVideoEnabled(!videoEnabled);
  };

  const toggleScreenShare = async () => {
    setScreenSharing(!screenSharing);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const reconnect = async () => {
    setError(null);
    await initializeWebRTC();
  };

  const cleanup = () => {
    // Nettoyage des ressources
  };

  const endCall = () => {
    cleanup();
    onClose();
  };

  const getQualityColor = () => {
    switch (connectionQuality) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-yellow-600';
      case 'poor': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getQualityIcon = () => {
    switch (connectionQuality) {
      case 'excellent': return <Wifi className="w-4 h-4" />;
      case 'good': return <Wifi className="w-4 h-4" />;
      case 'poor': return <WifiOff className="w-4 h-4" />;
      default: return <Wifi className="w-4 h-4" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 text-white p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Monitor className="w-6 h-6" />
          <span className="font-semibold">
            WebRTC - {isAgent ? 'Agent' : 'Client'} - Ticket #{ticketId.slice(0, 8)}
          </span>
          <div className={`px-2 py-1 rounded text-xs flex items-center space-x-1 ${
            isConnected ? 'bg-green-600' : isConnecting ? 'bg-yellow-600' : 'bg-red-600'
          }`}>
            {isConnected ? <Wifi className="w-3 h-3" /> : isConnecting ? <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div> : <WifiOff className="w-3 h-3" />}
            <span>{isConnected ? 'Connecté' : isConnecting ? 'Connexion...' : 'Déconnecté'}</span>
          </div>
          {isConnected && (
            <div className={`px-2 py-1 rounded text-xs flex items-center space-x-1 ${getQualityColor()}`}>
              {getQualityIcon()}
              <span className="capitalize">{connectionQuality}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleAudio}
            className={`p-2 rounded ${audioEnabled ? 'bg-green-600' : 'bg-red-600'}`}
            title={audioEnabled ? 'Couper le micro' : 'Activer le micro'}
          >
            {audioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </button>
          
          <button
            onClick={toggleVideo}
            className={`p-2 rounded ${videoEnabled ? 'bg-green-600' : 'bg-red-600'}`}
            title={videoEnabled ? 'Couper la caméra' : 'Activer la caméra'}
          >
            {videoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
          </button>
          
          <button
            onClick={toggleScreenShare}
            className={`p-2 rounded ${screenSharing ? 'bg-blue-600' : 'bg-gray-600'}`}
            title={screenSharing ? 'Arrêter le partage' : 'Partager l\'écran'}
          >
            <Monitor className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => setShowChat(!showChat)}
            className={`p-2 rounded ${showChat ? 'bg-purple-600' : 'bg-gray-600'}`}
            title="Chat"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
          
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded bg-gray-600"
            title="Plein écran"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
          
          {error && (
            <button
              onClick={reconnect}
              className="p-2 rounded bg-yellow-600"
              title="Reconnecter"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
          
          <button
            onClick={endCall}
            className="p-2 rounded bg-red-600"
            title="Terminer"
          >
            <PhoneOff className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative bg-black flex">
        {/* Video Container */}
        <div className="flex-1 relative">
          {/* Remote Video (Principal) */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-contain"
          />
          
          {/* Local Video (Picture-in-Picture) */}
          <div className="absolute top-4 right-4 w-64 h-48 bg-gray-800 rounded-lg overflow-hidden border-2 border-white">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-2 left-2 text-white text-xs bg-black bg-opacity-50 px-2 py-1 rounded">
              {isAgent ? 'Agent' : 'Client'} ({screenSharing ? 'Écran' : 'Caméra'})
            </div>
          </div>
          
          {/* Error Overlay */}
          {error && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-red-600 text-white p-4 rounded-lg">
              <p className="font-semibold">Erreur de connexion</p>
              <p className="text-sm">{error}</p>
              <button
                onClick={reconnect}
                className="mt-2 bg-white text-red-600 px-3 py-1 rounded text-sm"
              >
                Reconnecter
              </button>
            </div>
          )}
          
          {/* Connection Status Overlay */}
          {!isConnected && !error && (
            <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
              <div className="text-center text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                <h3 className="text-xl font-semibold mb-2">
                  {isConnecting ? 'Connexion en cours...' : 'En attente de connexion'}
                </h3>
                <p className="text-gray-300">
                  {isAgent ? 'En attente du client' : 'En attente de l\'agent'}
                </p>
                {!isConnecting && isAgent && (
                  <button
                    onClick={() => setIsConnecting(true)}
                    className="mt-4 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg flex items-center space-x-2 mx-auto"
                  >
                    <Phone className="w-4 h-4" />
                    <span>Démarrer l'appel</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Chat Panel */}
        {showChat && (
          <div className="w-80 bg-gray-800 text-white flex flex-col">
            <div className="p-4 border-b border-gray-700">
              <h3 className="font-semibold flex items-center space-x-2">
                <MessageSquare className="w-4 h-4" />
                <span>Chat</span>
              </h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {chatMessages.map((msg) => (
                <div key={msg.id} className="text-sm">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-medium text-blue-400">{msg.sender}</span>
                    <span className="text-gray-500 text-xs">
                      {msg.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-gray-300">{msg.message}</div>
                </div>
              ))}
            </div>
            
            <div className="p-4 border-t border-gray-700">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && setChatInput('')}
                  placeholder="Tapez votre message..."
                  className="flex-1 bg-gray-700 text-white px-3 py-2 rounded text-sm"
                />
                <button
                  onClick={() => setChatInput('')}
                  disabled={!chatInput.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-3 py-2 rounded"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="bg-gray-900 text-white p-2 flex items-center justify-between text-sm">
        <div className="flex items-center space-x-4">
          <span>Ticket #{ticketId.slice(0, 8)}</span>
          <span>•</span>
          <span>Session WebRTC P2P</span>
          {isConnected && (
            <>
              <span>•</span>
              <span className={getQualityColor()}>
                Qualité: {connectionQuality}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Users className="w-4 h-4" />
          <span>{isConnected ? '2' : '1'} participant(s)</span>
        </div>
      </div>
    </div>
  );
};

export default WebRTCRemoteControl;