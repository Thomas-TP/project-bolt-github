import React, { useState, useEffect } from 'react';
import { Users, Clock, CheckCircle, AlertTriangle, TrendingUp, Activity, MessageSquare } from 'lucide-react';
import StatsCard from './StatsCard';
import TicketCard from '../Tickets/TicketCard';
import { ticketService } from '../../services/ticketService';
import { userService } from '../../services/userService';
import { useUser } from '../../hooks/useUser';
import { Database } from '../../lib/supabase-types';

type Ticket = Database['public']['Tables']['tickets']['Row'] & {
  client?: { id: string; full_name: string; email: string };
  agent?: { id: string; full_name: string; email: string };
};

const AgentDashboard: React.FC = () => {
  const { user } = useUser();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<any>({});
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchData();
    }

    // Écouter l'événement de rafraîchissement du dashboard
    const handleRefreshDashboard = () => {
      console.log('Rafraîchissement du dashboard agent...');
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
      const [ticketsData, statsData, agentsData] = await Promise.all([
        ticketService.getTickets(user.id, user.role),
        ticketService.getTicketStats(user.id, user.role),
        userService.getAgents()
      ]);
      
      // Filtrer les tickets prioritaires pour l'agent
      const priorityTickets = ticketsData?.filter(ticket => 
        ticket.agent_id === user.id || 
        (ticket.priority === 'urgente' && !ticket.agent_id) ||
        ticket.status === 'ouvert'
      ).slice(0, 10) || [];
      
      setTickets(priorityTickets);
      setStats(statsData || {});
      setAgents(agentsData || []);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTakeTicket = async (ticketId: string) => {
    if (!user) return;
    
    try {
      await ticketService.assignTicket(ticketId, user.id);
      fetchData(); // Recharger les données
    } catch (error) {
      console.error('Erreur lors de l\'assignation du ticket:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const myTickets = tickets.filter(t => t.agent_id === user?.id);
  const unassignedTickets = tickets.filter(t => !t.agent_id);
  const urgentTickets = tickets.filter(t => t.priority === 'urgente');

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Agent</h1>
          <p className="text-gray-600 mt-2">Vue d'ensemble de votre activité</p>
        </div>
        <div className="flex items-center space-x-3">
          <span className="flex items-center space-x-2 text-green-600 bg-green-50 px-3 py-2 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm font-medium">En ligne</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        <StatsCard
          title="Mes Tickets"
          value={myTickets.length}
          change={`${stats.total || 0} au total`}
          changeType="neutral"
          icon={Users}
          color="blue"
        />
        <StatsCard
          title="En Cours"
          value={stats.en_cours || 0}
          change={`${urgentTickets.length} urgents`}
          changeType={urgentTickets.length > 0 ? "negative" : "neutral"}
          icon={Clock}
          color="yellow"
        />
        <StatsCard
          title="Résolus"
          value={stats.resolu || 0}
          change="Total résolus"
          changeType="positive"
          icon={CheckCircle}
          color="green"
        />
        <StatsCard
          title="Non Assignés"
          value={unassignedTickets.length}
          change="À prendre"
          changeType={unassignedTickets.length > 0 ? "negative" : "positive"}
          icon={Activity}
          color="purple"
        />
        <StatsCard
          title="Fermés"
          value={stats.ferme || 0}
          change="Total fermés"
          changeType="positive"
          icon={TrendingUp}
          color="green"
        />
        <StatsCard
          title="Urgents"
          value={urgentTickets.length}
          change="Attention requise"
          changeType={urgentTickets.length > 0 ? "negative" : "positive"}
          icon={AlertTriangle}
          color="red"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Tickets Prioritaires</h2>
              <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                <option>Tous les tickets</option>
                <option>Mes tickets</option>
                <option>Non assignés</option>
                <option>Urgents</option>
              </select>
            </div>
            
            {tickets.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-3" />
                <p className="text-gray-500">Aucun ticket prioritaire</p>
                <p className="text-sm text-gray-400">Excellent travail !</p>
              </div>
            ) : (
              <div className="space-y-4">
                {tickets.map((ticket) => (
                  <div key={ticket.id} className="relative">
                    <TicketCard 
                      ticket={ticket} 
                      onClick={() => {
                        // Naviguer vers la page ticket et ouvrir le ticket
                        window.history.pushState({}, '', `/tickets/${ticket.id}`);
                        window.dispatchEvent(new PopStateEvent('popstate'));
                      }}
                    />
                    {!ticket.agent_id && (
                      <div className="absolute top-4 right-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTakeTicket(ticket.id);
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                        >
                          Prendre
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* Performance basée sur les vraies données */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Tickets résolus</span>
                  <span className="font-medium">{stats.resolu || 0}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full" 
                    style={{ width: `${Math.min(((stats.resolu || 0) / Math.max(stats.total || 1, 1)) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Tickets en cours</span>
                  <span className="font-medium">{stats.en_cours || 0}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full" 
                    style={{ width: `${Math.min(((stats.en_cours || 0) / Math.max(stats.total || 1, 1)) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Tickets ouverts</span>
                  <span className="font-medium">{stats.ouvert || 0}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-yellow-500 h-2 rounded-full" 
                    style={{ width: `${Math.min(((stats.ouvert || 0) / Math.max(stats.total || 1, 1)) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions Rapides</h3>
            <div className="space-y-3">
              <button 
                onClick={() => {
                  // Naviguer vers la section tickets avec filtre non assignés
                  localStorage.setItem('activeSection', 'tickets');
                  localStorage.setItem('statusFilter', 'ouvert');
                  window.location.reload();
                }}
                className="w-full p-3 text-left bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                <div className="font-medium text-blue-900">Prendre un ticket</div>
                <div className="text-sm text-blue-600">File d'attente: {unassignedTickets.length} tickets</div>
              </button>
              <button 
                onClick={() => {
                  // Naviguer vers la section base de connaissances
                  localStorage.setItem('activeSection', 'knowledge');
                  window.location.reload();
                }}
                className="w-full p-3 text-left bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
              >
                <div className="font-medium text-green-900">Créer un article KB</div>
                <div className="text-sm text-green-600">Base de connaissances</div>
              </button>
              <button 
                onClick={() => {
                  // Naviguer vers la section analytics
                  localStorage.setItem('activeSection', 'analytics');
                  window.location.reload();
                }}
                className="w-full p-3 text-left bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
              >
                <div className="font-medium text-purple-900">Rapport journalier</div>
                <div className="text-sm text-purple-600">Générer le rapport</div>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Équipe en Ligne</h3>
            <div className="space-y-3">
              {agents.length === 0 ? (
                <p className="text-gray-500 text-sm">Aucun agent en ligne</p>
              ) : (
                agents.slice(0, 5).map((agent) => (
                  <div key={agent.id} className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      {agent.avatar_url ? (
                        <img 
                          src={agent.avatar_url} 
                          alt={agent.full_name} 
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-white text-sm font-medium">
                          {agent.full_name?.charAt(0) || agent.email.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {agent.full_name || agent.email}
                      </div>
                      <div className="text-sm text-gray-500">
                        {agent.id === user?.id ? 'Vous' : 'En ligne'}
                      </div>
                    </div>
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentDashboard;