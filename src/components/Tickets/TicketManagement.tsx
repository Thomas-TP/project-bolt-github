import React, { useState, useEffect } from 'react';
import UserProfileModal from '../Users/UserProfileModal';
import { userService } from '../../services/userService';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Plus, Search, Filter, Clock, User, AlertCircle, Trash2 } from 'lucide-react';
import { ticketService } from '../../services/ticketService';
import { useUser } from '../../hooks/useUser';
import { Database } from '../../lib/supabase-types';
import AITicketCreator from '../AIAssistant/AITicketCreator';
import CreateTicketModal from './CreateTicketModal';
import TicketDetailModal from './TicketDetailModal';

type Ticket = Database['public']['Tables']['tickets']['Row'] & {
  client?: { id: string; full_name: string; email: string };
  agent?: { id: string; full_name: string; email: string };
};

const TicketManagement: React.FC = () => {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  // Détecte le sous-onglet à partir de l'URL
  const getTabFromPath = () => {
    if (location.pathname.endsWith('/messages')) return 'messages';
    if (location.pathname.endsWith('/files')) return 'files';
    return 'details';
  };
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(() => {
    if (ticketId) return ticketId;
    return localStorage.getItem('selectedTicketId');
  });
  const [activeTab, setActiveTab] = useState<'details' | 'messages' | 'files'>(getTabFromPath());
  // Synchronise l'ouverture du ticket avec l'URL
  // Synchronise l'ouverture du ticket et l'onglet avec l'URL
  useEffect(() => {
    if (ticketId && selectedTicketId !== ticketId) {
      setSelectedTicketId(ticketId);
    }
    setActiveTab(getTabFromPath());
    // Si on ferme le ticket, revenir à /tickets
    if (!ticketId && selectedTicketId) {
      if (window.location.pathname.startsWith('/tickets/')) {
        navigate('/tickets');
      }
    }
    // eslint-disable-next-line
  }, [ticketId, location.pathname]);
  const [deletingTicketId, setDeletingTicketId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<Database['public']['Tables']['users']['Row'] | null>(null);
  const [loadingUser, setLoadingUser] = useState(false);

  useEffect(() => {
    fetchTickets();

    // Écouter l'événement de rafraîchissement des tickets
    const handleRefreshTickets = () => {
      console.log('Rafraîchissement des tickets...');
      fetchTickets();
    };

    window.addEventListener('refreshTickets', handleRefreshTickets);
    
    // Écouter les nouveaux messages pour un ticket spécifique
    const handleNewMessage = (event: CustomEvent) => {
      if (event.detail && event.detail.ticketId) {
        console.log('Nouveau message pour le ticket:', event.detail.ticketId);
        // Si le ticket est actuellement ouvert, rafraîchir ses détails
        if (selectedTicketId === event.detail.ticketId) {
          // Émettre un événement pour rafraîchir les messages du ticket
          window.dispatchEvent(new CustomEvent('refreshTicketMessages', { 
            detail: { ticketId: event.detail.ticketId }
          }));
        }
      }
    };

    window.addEventListener('newMessage', handleNewMessage as EventListener);

    return () => {
      window.removeEventListener('refreshTickets', handleRefreshTickets);
      window.removeEventListener('newMessage', handleNewMessage as EventListener);
    };
  }, [user, selectedTicketId]);

  // Sauvegarder le ticket sélectionné dans le localStorage
  useEffect(() => {
    if (selectedTicketId) {
      localStorage.setItem('selectedTicketId', selectedTicketId);
    } else {
      localStorage.removeItem('selectedTicketId');
    }
  }, [selectedTicketId]);

  const fetchTickets = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const data = await ticketService.getTickets(user.id, user.role);
      setTickets(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!user || !searchQuery.trim()) {
      fetchTickets();
      return;
    }

    try {
      setLoading(true);
      const data = await ticketService.searchTickets(searchQuery, user.id, user.role);
      setTickets(data || []);
    } catch (error) {
      console.error('Erreur lors de la recherche:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTicket = async (ticketId: string) => {
    if (!user || user.role !== 'admin') {
      alert('Seuls les administrateurs peuvent supprimer des tickets');
      return;
    }

    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;

    const confirmMessage = `Êtes-vous sûr de vouloir supprimer définitivement le ticket "${ticket.title}" ?\n\nCette action supprimera également :\n- Tous les messages associés\n- Tous les fichiers joints\n- Toutes les notifications liées\n\nCette action est IRRÉVERSIBLE.`;
    
    if (!confirm(confirmMessage)) return;

    try {
      setDeletingTicketId(ticketId);
      console.log('🗑️ Début suppression ticket:', ticketId);
      
      const result = await ticketService.deleteTicket(ticketId);
      console.log('✅ Résultat suppression:', result);
      
      // Retirer le ticket de la liste
      setTickets(prev => prev.filter(t => t.id !== ticketId));
      
      // Fermer le modal de détails si c'est le ticket supprimé
      if (selectedTicketId === ticketId) {
        setSelectedTicketId(null);
      }
      
      // Message de succès détaillé
      if (result && typeof result === 'object') {
        const details = [];
        if (result.deleted_messages > 0) details.push(`${result.deleted_messages} message(s)`);
        if (result.deleted_files > 0) details.push(`${result.deleted_files} fichier(s)`);
        if (result.deleted_notifications > 0) details.push(`${result.deleted_notifications} notification(s)`);
        
        const detailsText = details.length > 0 ? `\n\nÉléments supprimés :\n- ${details.join('\n- ')}` : '';
        alert(`✅ Ticket supprimé avec succès !${detailsText}`);
      } else {
        alert('✅ Ticket supprimé avec succès !');
      }
      
    } catch (error) {
      console.error('❌ Erreur lors de la suppression:', error);
      
      let errorMessage = 'Erreur lors de la suppression du ticket';
      if (error instanceof Error) {
        errorMessage += `: ${error.message}`;
      }
      
      alert(`❌ ${errorMessage}\n\nVeuillez réessayer ou contacter l'administrateur.`);
    } finally {
      setDeletingTicketId(null);
    }
  };

  const handleUserClick = async (userId: string) => {
    setLoadingUser(true);
    try {
      const user = await userService.getUserProfileById(userId);
      setSelectedUser(user);
    } catch (error) {
      alert('Erreur lors du chargement du profil utilisateur');
    } finally {
      setLoadingUser(false);
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    if (statusFilter !== 'all' && ticket.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && ticket.priority !== priorityFilter) return false;
    return true;
  });

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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgente': return 'bg-red-100 text-red-800 border-red-200';
      case 'elevee': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'normale': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'faible': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const statusOptions = [
    { value: 'all', label: 'Tous les statuts' },
    { value: 'ouvert', label: 'Ouvert' },
    { value: 'en_cours', label: 'En cours' },
    { value: 'en_attente', label: 'En attente' },
    { value: 'resolu', label: 'Résolu' },
    { value: 'ferme', label: 'Fermé' }
  ];

  const priorityOptions = [
    { value: 'all', label: 'Toutes les priorités' },
    { value: 'faible', label: 'Faible' },
    { value: 'normale', label: 'Normale' },
    { value: 'elevee', label: 'Élevée' },
    { value: 'urgente', label: 'Urgente' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestion des Tickets</h1>
          <p className="text-gray-600 mt-2">
            {user?.role === 'client' ? 'Gérez vos demandes de support' : 'Gérez tous les tickets de support'}
          </p>
        </div>
        
        {user?.role === 'client' && (
          <div className="flex space-x-4">
            <AITicketCreator />
            
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors shadow-sm"
            >
              <Plus className="w-5 h-5" />
              <span>Créer manuellement</span>
            </button>
          </div>
        )}
      </div>

      {/* Filtres et recherche */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Rechercher des tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                onClick={handleSearch}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
              >
                Rechercher
              </button>
            </div>
          </div>
          
          <div className="flex gap-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {priorityOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Liste des tickets */}
      <div className="space-y-4">
        {filteredTickets.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun ticket trouvé</h3>
            <p className="text-gray-500">
              {searchQuery 
                ? "Aucun ticket ne correspond à votre recherche"
                : "Vous n'avez pas encore de tickets"
              }
            </p>
            {user?.role === 'client' && !searchQuery && (
              <div className="mt-4 flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-3">
                <AITicketCreator />
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  Créer manuellement
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredTickets.map((ticket) => (
              <div key={ticket.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-all duration-200">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{ticket.title}</h3>
                    <p className="text-gray-600 text-sm line-clamp-2 mb-3">{ticket.description}</p>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>{new Date(ticket.created_at).toLocaleDateString('fr-FR')}</span>
                      </div>
                      
                      {ticket.client && user?.role !== 'client' && (
                        <div className="flex items-center space-x-1">
                          <User className="w-4 h-4" />
                          <span
                            className="cursor-pointer hover:underline text-blue-700 font-semibold"
                            onClick={() => handleUserClick(ticket.client.id)}
                            title="Voir le profil du client"
                          >
                            {ticket.client.full_name || ticket.client.email}
                          </span>
                        </div>
                      )}
                      
                      {ticket.agent && (
                        <div className="flex items-center space-x-1">
                          <User className="w-4 h-4" />
                          <span
                            className="cursor-pointer hover:underline text-yellow-700 font-semibold"
                            onClick={() => handleUserClick(ticket.agent.id)}
                            title="Voir le profil de l'agent"
                          >
                            Agent: {ticket.agent.full_name || ticket.agent.email}
                          </span>
                        </div>
                      )}
                      
                      <span>Catégorie: {ticket.category}</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end space-y-2 ml-4">
                    <div className="flex items-center space-x-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                        {ticket.status.replace('_', ' ').charAt(0).toUpperCase() + ticket.status.replace('_', ' ').slice(1)}
                      </span>
                    </div>
                    
                    {ticket.priority === 'urgente' && (
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    )}

                    {/* Bouton de suppression pour les admins */}
                    {user?.role === 'admin' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTicket(ticket.id);
                        }}
                        disabled={deletingTicketId === ticket.id}
                        className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 group"
                        title="Supprimer le ticket (Admin)"
                      >
                        {deletingTicketId === ticket.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                        ) : (
                          <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">
                      Mis à jour: {new Date(ticket.updated_at).toLocaleString('fr-FR')}
                    </span>
                    <button 
                      onClick={() => {
                        setSelectedTicketId(ticket.id);
                        navigate(`/tickets/${ticket.id}`);
                      }}
                      className="text-blue-600 hover:text-blue-800 font-medium text-sm hover:underline transition-colors"
                    >
                      Voir détails →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de création de ticket */}
      {showCreateModal && (
        <CreateTicketModal
          onClose={() => setShowCreateModal(false)}
          onTicketCreated={() => {
            setShowCreateModal(false);
            fetchTickets();
          }}
        />
      )}

      {/* Modal de détails du ticket */}
      {selectedTicketId && (
        <TicketDetailModal
          ticketId={selectedTicketId}
          activeTab={activeTab}
          onTabChange={tab => {
            setActiveTab(tab);
            if (selectedTicketId) {
              navigate(`/tickets/${selectedTicketId}/${tab === 'details' ? '' : tab}`.replace(/\/$/, ''));
            }
          }}
          onClose={() => {
            setSelectedTicketId(null);
            navigate('/tickets');
          }}
          onTicketUpdated={() => {
            fetchTickets();
          }}
        />
      )}

      {/* Modal de profil utilisateur */}
      {selectedUser && (
        <UserProfileModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
        />
      )}
      {loadingUser && <p>Chargement du profil utilisateur...</p>}
    </div>
  );
};

export default TicketManagement;