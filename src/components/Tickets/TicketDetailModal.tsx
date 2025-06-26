import React, { useState, useEffect } from 'react';
import { X, Clock, User, AlertCircle, MessageSquare, Paperclip, Send, Download, Eye, Edit, Trash2, Database } from 'lucide-react';
import { ticketService } from '../../services/ticketService';
import { messageService } from '../../services/messageService';
import { useUser } from '../../hooks/useUser';
import { Database as DatabaseType } from '../../lib/supabase-types';
import MessageCenter from '../Messages/MessageCenter';
import RemoteControlButton from '../RemoteControl/RemoteControlButton';
import { hybridStorage } from '../../utils/hybridStorage';

type Ticket = DatabaseType['public']['Tables']['tickets']['Row'] & {
  client?: { id: string; full_name: string; email: string; company?: string };
  agent?: { id: string; full_name: string; email: string };
};

type Message = DatabaseType['public']['Tables']['messages']['Row'] & {
  user?: { id: string; full_name: string; email: string; role: string; avatar_url?: string };
};

interface TicketDetailModalProps {
  ticketId: string;
  activeTab?: 'details' | 'messages' | 'files';
  onTabChange?: (tab: 'details' | 'messages' | 'files') => void;
  onClose: () => void;
  onTicketUpdated: () => void;
}

const TicketDetailModal: React.FC<TicketDetailModalProps> = ({ ticketId, activeTab: propActiveTab, onTabChange, onClose, onTicketUpdated }) => {
  const { user } = useUser();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'messages' | 'files'>(propActiveTab || 'details');
  const [error, setError] = useState<string | null>(null);
  const [allFiles, setAllFiles] = useState<any[]>([]);
  // Synchronise l'onglet actif avec la prop
  useEffect(() => {
    if (propActiveTab && propActiveTab !== activeTab) {
      setActiveTab(propActiveTab);
    }
    // eslint-disable-next-line
  }, [propActiveTab]);

  useEffect(() => {
    // Vérifier que le ticketId est valide avant de faire quoi que ce soit
    if (!ticketId || ticketId === 'demo' || !isValidUUID(ticketId)) {
      setError('ID de ticket invalide');
      setLoading(false);
      return;
    }

    fetchTicketDetails();
    fetchTicketFiles();

    // Écouter l'événement de rafraîchissement des messages du ticket
    const handleRefreshMessages = (event: CustomEvent) => {
      if (event.detail && event.detail.ticketId === ticketId) {
        console.log('Rafraîchissement des messages du ticket:', ticketId);
        fetchTicketDetails();
        fetchTicketFiles();
      }
    };

    window.addEventListener('refreshTicketMessages', handleRefreshMessages as EventListener);
    
    return () => {
      window.removeEventListener('refreshTicketMessages', handleRefreshMessages as EventListener);
    };
  }, [ticketId]);

  // Fonction pour valider un UUID
  const isValidUUID = (uuid: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  };

  const fetchTicketDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ticketService.getTicketById(ticketId);
      setTicket(data);
    } catch (error) {
      console.error('Erreur lors du chargement du ticket:', error);
      setError('Impossible de charger le ticket');
    } finally {
      setLoading(false);
    }
  };

  const fetchTicketFiles = async () => {
    try {
      console.log('📁 Récupération des fichiers du ticket:', ticketId);
      
      // Récupérer les fichiers du ticket depuis la base de données
      const ticketFiles = await hybridStorage.getFiles(ticketId, 'ticket');
      
      // Récupérer les fichiers des messages depuis la base de données
      const messageFiles = await hybridStorage.getFiles(ticketId, 'message');
      
      const allTicketFiles = [
        ...ticketFiles.map(file => ({ ...file, source: 'ticket' })),
        ...messageFiles.map(file => ({ ...file, source: 'message' }))
      ];
      
      setAllFiles(allTicketFiles);
      console.log(`📁 Total fichiers trouvés: ${allTicketFiles.length}`);
    } catch (error) {
      console.error('Erreur lors du chargement des fichiers:', error);
    }
  };

  const handleStatusChange = async (newStatus: Ticket['status']) => {
    if (!ticket) return;

    try {
      setUpdating(true);
      await ticketService.updateTicketStatus(ticketId, newStatus);
      setTicket(prev => prev ? { ...prev, status: newStatus } : null);
      onTicketUpdated();
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleAssignToMe = async () => {
    if (!ticket || !user) return;

    try {
      setUpdating(true);
      await ticketService.assignTicket(ticketId, user.id);
      setTicket(prev => prev ? { ...prev, agent_id: user.id, status: 'en_cours' } : null);
      onTicketUpdated();
    } catch (error) {
      console.error('Erreur lors de l\'assignation:', error);
    } finally {
      setUpdating(false);
    }
  };

  const downloadFile = async (file: any) => {
    try {
      console.log('📥 Téléchargement fichier depuis la base:', file);
      
      const success = await hybridStorage.downloadFile(file);
      
      if (!success) {
        setError('Impossible de télécharger le fichier');
      }
    } catch (error) {
      console.error('❌ Erreur lors du téléchargement:', error);
      setError('Erreur lors du téléchargement');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgente': return 'bg-red-100 text-red-800 border-red-200';
      case 'elevee': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'normale': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'faible': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ouvert': return 'bg-blue-100 text-blue-800';
      case 'en_cours': return 'bg-yellow-100 text-yellow-800';
      case 'en_attente': return 'bg-orange-100 text-orange-800';
      case 'resolu': return 'bg-green-100 text-green-800';
      case 'ferme': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR');
  };

  const getUserInitials = (user: any) => {
    if (user?.full_name) {
      return user.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase();
    }
    return user?.email?.[0]?.toUpperCase() || '?';
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Erreur</h3>
          <p className="text-red-600 mb-4">{error || 'Ticket non trouvé'}</p>
          <button 
            onClick={onClose} 
            className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    );
  }

  const ticketFiles = allFiles.filter(f => f.source === 'ticket');
  const messageFiles = allFiles.filter(f => f.source === 'message');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-bold text-gray-900">Ticket #{ticket.id.slice(0, 8)}</h2>
            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getPriorityColor(ticket.priority)}`}>
              {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
              {ticket.status.replace('_', ' ').charAt(0).toUpperCase() + ticket.status.replace('_', ' ').slice(1)}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'details', label: 'Détails', icon: Eye },
              { id: 'messages', label: 'Messages', icon: MessageSquare },
              { id: 'files', label: `Fichiers (${allFiles.length})`, icon: Database }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as 'details' | 'messages' | 'files');
                  if (onTabChange) onTabChange(tab.id as 'details' | 'messages' | 'files');
                }}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'details' && (
            <div className="p-6 space-y-6">
              {/* Actions rapides */}
              {(user?.role === 'agent' || user?.role === 'admin') && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3">Actions rapides</h3>
                  <div className="flex flex-wrap gap-2">
                    {ticket.status === 'ouvert' && !ticket.agent_id && (
                      <button
                        onClick={handleAssignToMe}
                        disabled={updating}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
                      >
                        M'assigner ce ticket
                      </button>
                    )}
                    
                    {ticket.status !== 'en_attente' && (
                      <button
                        onClick={() => handleStatusChange('en_attente')}
                        disabled={updating}
                        className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
                      >
                        Mettre en attente
                      </button>
                    )}
                    
                    {ticket.status !== 'resolu' && (
                      <button
                        onClick={() => handleStatusChange('resolu')}
                        disabled={updating}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
                      >
                        Marquer comme résolu
                      </button>
                    )}
                    
                    {ticket.status !== 'ferme' && (
                      <button
                        onClick={() => handleStatusChange('ferme')}
                        disabled={updating}
                        className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
                      >
                        Fermer le ticket
                      </button>
                    )}
                    
                    <button
                      onClick={() => setActiveTab('messages')}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                    >
                      Ouvrir le chat
                    </button>

                    {/* Bouton de contrôle à distance */}
                    {ticket.client && (
                      <RemoteControlButton
                        ticketId={ticket.id}
                        clientEmail={ticket.client.email}
                        disabled={ticket.status === 'ferme'}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Informations du ticket */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Informations générales</h3>
                    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Titre</label>
                        <p className="text-gray-900">{ticket.title}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Catégorie</label>
                        <p className="text-gray-900">{ticket.category}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Description</label>
                        <p className="text-gray-900 whitespace-pre-wrap">{ticket.description}</p>
                      </div>
                      {ticket.tags && ticket.tags.length > 0 && (
                        <div>
                          <label className="text-sm font-medium text-gray-600">Tags</label>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {ticket.tags.map((tag, index) => (
                              <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Détails</h3>
                    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-600">Créé le</span>
                        <span className="text-gray-900">{formatDate(ticket.created_at)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-600">Mis à jour le</span>
                        <span className="text-gray-900">{formatDate(ticket.updated_at)}</span>
                      </div>
                      {ticket.resolved_at && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-600">Résolu le</span>
                          <span className="text-gray-900">{formatDate(ticket.resolved_at)}</span>
                        </div>
                      )}
                      {ticket.closed_at && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-600">Fermé le</span>
                          <span className="text-gray-900">{formatDate(ticket.closed_at)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Personnes impliquées</h3>
                    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Client</label>
                        <div className="flex items-center space-x-2 mt-1">
                          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                            {getUserInitials(ticket.client)}
                          </div>
                          <div>
                            <p className="text-gray-900">{ticket.client?.full_name || ticket.client?.email}</p>
                            {ticket.client?.company && (
                              <p className="text-sm text-gray-500">{ticket.client.company}</p>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {ticket.agent ? (
                        <div>
                          <label className="text-sm font-medium text-gray-600">Agent assigné</label>
                          <div className="flex items-center space-x-2 mt-1">
                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                              {getUserInitials(ticket.agent)}
                            </div>
                            <p className="text-gray-900">{ticket.agent.full_name || ticket.agent.email}</p>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <label className="text-sm font-medium text-gray-600">Agent assigné</label>
                          <p className="text-gray-500">Non assigné</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'messages' && (
            <div className="h-full">
              <MessageCenter ticketId={ticketId} />
            </div>
          )}

          {activeTab === 'files' && (
            <div className="p-6">
              <div className="space-y-6">
                {allFiles.length === 0 ? (
                  <div className="bg-gray-50 rounded-lg p-8 text-center">
                    <Database className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun fichier joint</h3>
                    <p className="text-gray-500 mb-4">
                      Aucun fichier n'a été joint à ce ticket ou à ses messages
                    </p>
                    <p className="text-sm text-gray-400">
                      Pour joindre des fichiers, utilisez l'onglet "Messages" et cliquez sur l'icône trombone
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Fichiers du ticket */}
                    {ticketFiles.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                          <Database className="w-5 h-5 text-blue-600" />
                          <span>Fichiers joints au ticket ({ticketFiles.length})</span>
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {ticketFiles.map((file, index) => (
                            <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                              <div className="flex items-center justify-between mb-2">
                                <Database className="w-5 h-5 text-blue-600" />
                                <button
                                  onClick={() => downloadFile(file)}
                                  className="text-blue-600 hover:text-blue-800 p-1 rounded"
                                  title="Télécharger"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                              </div>
                              <h4 className="font-medium text-gray-900 text-sm mb-1 truncate">
                                {file.originalName}
                              </h4>
                              <p className="text-xs text-gray-500 mb-2">
                                {formatFileSize(file.size)}
                              </p>
                              <div className="flex items-center justify-between">
                                <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                  Ticket
                                </span>
                                <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                                  Base
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Fichiers des messages */}
                    {messageFiles.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                          <Database className="w-5 h-5 text-green-600" />
                          <span>Fichiers joints aux messages ({messageFiles.length})</span>
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {messageFiles.map((file, index) => (
                            <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                              <div className="flex items-center justify-between mb-2">
                                <Database className="w-5 h-5 text-green-600" />
                                <button
                                  onClick={() => downloadFile(file)}
                                  className="text-blue-600 hover:text-blue-800 p-1 rounded"
                                  title="Télécharger"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                              </div>
                              <h4 className="font-medium text-gray-900 text-sm mb-1 truncate">
                                {file.originalName}
                              </h4>
                              <p className="text-xs text-gray-500 mb-2">
                                {formatFileSize(file.size)}
                              </p>
                              <div className="flex items-center justify-between">
                                <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                                  Message
                                </span>
                                <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                                  Base
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TicketDetailModal;