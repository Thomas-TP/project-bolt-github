import React, { useState, useEffect } from 'react';
import { Plus, Clock, CheckCircle, AlertCircle, MessageSquare, TrendingUp } from 'lucide-react';
import StatsCard from './StatsCard';
import TicketCard from '../Tickets/TicketCard';
import CreateTicketModal from '../Tickets/CreateTicketModal';
import { ticketService } from '../../services/ticketService';
import { useUser } from '../../hooks/useUser';
import { Database } from '../../lib/supabase-types';
import AITicketCreator from '../AIAssistant/AITicketCreator';

type Ticket = Database['public']['Tables']['tickets']['Row'];

const ClientDashboard: React.FC = () => {
  const { user } = useUser();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (user) {
      fetchData();
    }

    // Écouter l'événement de rafraîchissement du dashboard
    const handleRefreshDashboard = () => {
      console.log('Rafraîchissement du dashboard client...');
      fetchData();
    };

    window.addEventListener('refreshDashboard', handleRefreshDashboard);
    
    return () => {
      window.removeEventListener('refreshDashboard', handleRefreshDashboard);
    };
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const [ticketsData, statsData] = await Promise.all([
        ticketService.getTickets(user.id, user.role),
        ticketService.getTicketStats(user.id, user.role)
      ]);
      
      setTickets(ticketsData?.slice(0, 5) || []); // Derniers 5 tickets
      setStats(statsData || {});
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tableau de Bord</h1>
          <p className="text-gray-600 mt-2">Gérez vos demandes de support</p>
        </div>
        
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Tickets Ouverts"
          value={stats.ouvert || 0}
          change={`${stats.total || 0} au total`}
          changeType="neutral"
          icon={Clock}
          color="blue"
        />
        <StatsCard
          title="En Cours"
          value={stats.en_cours || 0}
          change="Traitement en cours"
          changeType="neutral"
          icon={AlertCircle}
          color="yellow"
        />
        <StatsCard
          title="Résolus"
          value={stats.resolu || 0}
          change={`${stats.ferme || 0} fermés`}
          changeType="positive"
          icon={CheckCircle}
          color="green"
        />
        <StatsCard
          title="En Attente"
          value={stats.en_attente || 0}
          change="Réponse attendue"
          changeType="neutral"
          icon={MessageSquare}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Mes Tickets Récents</h2>
              <button 
                onClick={() => {
                  // Naviguer vers la section tickets
                  localStorage.setItem('activeSection', 'tickets');
                  window.location.reload();
                }}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Voir tout
              </button>
            </div>
            
            {tickets.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-4">Vous n'avez pas encore de tickets</p>
                <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-3">
                  <AITicketCreator />
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Créer manuellement
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {tickets.map((ticket) => (
                  <TicketCard 
                    key={ticket.id} 
                    ticket={ticket} 
                    onClick={() => {
                      window.history.pushState({}, '', `/tickets/${ticket.id}`);
                      window.dispatchEvent(new PopStateEvent('popstate'));
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Créer un Ticket</h3>
            <div className="space-y-3">
              <div className="p-4 bg-gradient-to-r from-red-50 to-yellow-50 rounded-lg hover:from-red-100 hover:to-yellow-100 transition-colors cursor-pointer" onClick={() => {
                // Naviguer vers la section AI Assistant
                localStorage.setItem('activeSection', 'ai-assistant');
                window.location.reload();
              }}>
                <div className="font-medium text-gray-900 mb-1">Assistant IA</div>
                <div className="text-sm text-gray-600">Créez un ticket en discutant avec notre IA</div>
              </div>
              
              <div className="p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer" onClick={() => setShowCreateModal(true)}>
                <div className="font-medium text-blue-900 mb-1">Formulaire Standard</div>
                <div className="text-sm text-blue-600">Créez un ticket manuellement</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Aide Rapide</h3>
            <div className="space-y-3">
              <a href="#" className="block p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                <div className="font-medium text-blue-900">Comment créer un ticket ?</div>
                <div className="text-sm text-blue-600">Guide pas à pas</div>
              </a>
              <a href="#" className="block p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
                <div className="font-medium text-green-900">FAQ Technique</div>
                <div className="text-sm text-green-600">Réponses aux questions courantes</div>
              </a>
              <a href="#" className="block p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
                <div className="font-medium text-purple-900">Base de Connaissances</div>
                <div className="text-sm text-purple-600">Articles et tutoriels</div>
              </a>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Conseils du Jour</h3>
            <div className="space-y-3">
              <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="font-medium text-yellow-900 mb-1">💡 Astuce</div>
                <div className="text-sm text-yellow-700">
                  Utilisez notre assistant IA pour créer des tickets plus détaillés et obtenir des solutions plus rapidement.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de création de ticket */}
      {showCreateModal && (
        <CreateTicketModal
          onClose={() => setShowCreateModal(false)}
          onTicketCreated={() => {
            setShowCreateModal(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
};

export default ClientDashboard;