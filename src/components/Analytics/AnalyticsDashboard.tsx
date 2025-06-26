import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, Clock, Target, Calendar, Download, Filter, RefreshCw, ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
import { ticketService } from '../../services/ticketService';
import { userService } from '../../services/userService';
import { analyticsService } from '../../services/analyticsService';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from './RechartsExports';
import { useUser } from '../../hooks/useUser';
import { supabase } from '../../utils/supabase';

const AnalyticsDashboard: React.FC = () => {
  const { user } = useUser();
  const [stats, setStats] = useState<any>({});
  const [timeRange, setTimeRange] = useState('7d');
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [ticketsEvolution, setTicketsEvolution] = useState<{ period: string, count: number }[]>([]);
  const [avgResolution, setAvgResolution] = useState<number>(0);
  const [ticketsByAgent, setTicketsByAgent] = useState<{ agent: string, count: number }[]>([]);
  const [ticketsByPriority, setTicketsByPriority] = useState<{ priority: string, count: number }[]>([]);
  const [agentsMap, setAgentsMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user && (user.role === 'agent' || user.role === 'admin')) {
      fetchAnalytics();
      fetchAdvancedStats();
    }
  }, [user, timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const [ticketStats, allUsers] = await Promise.all([
        ticketService.getTicketStats(),
        userService.getAllUsers()
      ]);

      const activeUsers = allUsers?.filter(u => u.is_active) || [];
      const agents = activeUsers.filter(u => u.role === 'agent');
      const clients = activeUsers.filter(u => u.role === 'client');

      setStats({
        tickets: ticketStats || {
          total: 0,
          ouvert: 0,
          en_cours: 0,
          en_attente: 0,
          resolu: 0,
          ferme: 0,
          urgents: 0
        },
        users: {
          total: activeUsers.length,
          agents: agents.length,
          clients: clients.length,
          newThisWeek: activeUsers.filter(u => {
            const created = new Date(u.created_at);
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return created > weekAgo;
          }).length
        }
      });
    } catch (error) {
      console.error('Erreur lors du chargement des analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdvancedStats = async () => {
    // Période: semaine/mois selon timeRange
    const period = timeRange === '7d' || timeRange === '30d' ? 'week' : 'month';
    setTicketsEvolution(await analyticsService.getTicketsEvolution(period));
    setAvgResolution(await analyticsService.getAverageResolutionTime());
    // Répartition par agent
    const byAgent = await analyticsService.getTicketsByAgent();
    // Récupérer tous les agents potentiels (même inactifs)
    const allAgents = await userService.getAllUsers();
    const agentsMap: Record<string, string> = {};
    for (const a of allAgents) {
      if (a.role === 'agent' || a.role === 'admin') {
        // Privilégier prénom + nom, sinon full_name, sinon email, sinon id
        let displayName = '';
        if (a.first_name && a.last_name) {
          displayName = `${a.first_name} ${a.last_name}`;
        } else if (a.full_name) {
          displayName = a.full_name;
        } else if (a.email) {
          displayName = a.email;
        } else {
          displayName = a.id;
        }
        agentsMap[a.id] = displayName;
      }
    }
    setAgentsMap(agentsMap);
    setTicketsByAgent(Object.entries(byAgent).map(([agent, count]) => ({ agent, count, full_name: agentsMap[agent] || '(Inconnu)' })));
    // Répartition par priorité
    const byPriority = await analyticsService.getTicketsByPriority();
    setTicketsByPriority(Object.entries(byPriority).map(([priority, count]) => ({ priority, count })));
  };

  if (!user || (user.role !== 'agent' && user.role !== 'admin')) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Accès restreint</h3>
        <p className="text-gray-500">Seuls les agents et administrateurs peuvent accéder aux analytics.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const ticketResolutionRate = stats.tickets?.total > 0 
    ? Math.round(((stats.tickets.resolu + stats.tickets.ferme) / stats.tickets.total) * 100)
    : 0;

  const urgentTicketsRate = stats.tickets?.total > 0
    ? Math.round((stats.tickets.urgents / stats.tickets.total) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600 mt-2">Rapports et statistiques détaillés</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="7d">7 derniers jours</option>
            <option value="30d">30 derniers jours</option>
            <option value="90d">90 derniers jours</option>
            <option value="1y">1 an</option>
          </select>
          
          <button 
            onClick={fetchAnalytics}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Actualiser</span>
          </button>
          
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors">
            <Download className="w-4 h-4" />
            <span>Exporter</span>
          </button>
        </div>
      </div>

      {/* Métriques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Tickets</p>
              <p className="text-3xl font-bold text-gray-900">{stats.tickets?.total || 0}</p>
              <p className="text-sm text-green-600 mt-1">
                +{stats.tickets?.ouvert || 0} nouveaux
              </p>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl">
              <BarChart3 className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Taux de Résolution</p>
              <p className="text-3xl font-bold text-gray-900">{ticketResolutionRate}%</p>
              <p className="text-sm text-gray-500 mt-1">
                {stats.tickets?.resolu || 0} résolus
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-xl">
              <Target className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Utilisateurs Actifs</p>
              <p className="text-3xl font-bold text-gray-900">{stats.users?.total || 0}</p>
              <p className="text-sm text-blue-600 mt-1">
                +{stats.users?.newThisWeek || 0} cette semaine
              </p>
            </div>
            <div className="p-3 bg-purple-50 rounded-xl">
              <Users className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Tickets Urgents</p>
              <p className="text-3xl font-bold text-gray-900">{stats.tickets?.urgents || 0}</p>
              <p className="text-sm text-red-600 mt-1">
                {urgentTicketsRate}% du total
              </p>
            </div>
            <div className="p-3 bg-red-50 rounded-xl">
              <Clock className="w-8 h-8 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Graphiques et détails */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Répartition des Tickets par Statut</h3>
            <button 
              onClick={() => setShowDetails(!showDetails)}
              className="text-gray-500 hover:text-gray-700"
            >
              {showDetails ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Ouverts</span>
              <div className="flex items-center space-x-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full" 
                    style={{ 
                      width: `${stats.tickets?.total > 0 ? (stats.tickets.ouvert / stats.tickets.total) * 100 : 0}%` 
                    }}
                  ></div>
                </div>
                <span className="text-sm font-medium">{stats.tickets?.ouvert || 0}</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">En cours</span>
              <div className="flex items-center space-x-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-yellow-500 h-2 rounded-full" 
                    style={{ 
                      width: `${stats.tickets?.total > 0 ? (stats.tickets.en_cours / stats.tickets.total) * 100 : 0}%` 
                    }}
                  ></div>
                </div>
                <span className="text-sm font-medium">{stats.tickets?.en_cours || 0}</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Résolus</span>
              <div className="flex items-center space-x-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full" 
                    style={{ 
                      width: `${stats.tickets?.total > 0 ? (stats.tickets.resolu / stats.tickets.total) * 100 : 0}%` 
                    }}
                  ></div>
                </div>
                <span className="text-sm font-medium">{stats.tickets?.resolu || 0}</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Fermés</span>
              <div className="flex items-center space-x-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gray-500 h-2 rounded-full" 
                    style={{ 
                      width: `${stats.tickets?.total > 0 ? (stats.tickets.ferme / stats.tickets.total) * 100 : 0}%` 
                    }}
                  ></div>
                </div>
                <span className="text-sm font-medium">{stats.tickets?.ferme || 0}</span>
              </div>
            </div>

            {showDetails && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">En attente</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-orange-500 h-2 rounded-full" 
                        style={{ 
                          width: `${stats.tickets?.total > 0 ? (stats.tickets.en_attente / stats.tickets.total) * 100 : 0}%` 
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium">{stats.tickets?.en_attente || 0}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Répartition des Utilisateurs</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Clients</span>
              <div className="flex items-center space-x-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full" 
                    style={{ 
                      width: `${stats.users?.total > 0 ? (stats.users.clients / stats.users.total) * 100 : 0}%` 
                    }}
                  ></div>
                </div>
                <span className="text-sm font-medium">{stats.users?.clients || 0}</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Agents</span>
              <div className="flex items-center space-x-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full" 
                    style={{ 
                      width: `${stats.users?.total > 0 ? (stats.users.agents / stats.users.total) * 100 : 0}%` 
                    }}
                  ></div>
                </div>
                <span className="text-sm font-medium">{stats.users?.agents || 0}</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Nouveaux (7j)</span>
              <div className="flex items-center space-x-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-purple-500 h-2 rounded-full" 
                    style={{ 
                      width: `${stats.users?.total > 0 ? (stats.users.newThisWeek / stats.users.total) * 100 : 0}%` 
                    }}
                  ></div>
                </div>
                <span className="text-sm font-medium">{stats.users?.newThisWeek || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Graphique d'évolution des tickets dans le temps */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Évolution des tickets ({timeRange === '7d' || timeRange === '30d' ? 'par semaine' : 'par mois'})</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={ticketsEvolution} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <XAxis dataKey="period" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        {/* Temps de résolution moyen */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col items-center justify-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Temps de résolution moyen</h3>
          <p className="text-3xl font-bold text-blue-700">{avgResolution} h</p>
          <p className="text-gray-500">(tickets résolus uniquement)</p>
        </div>
      </div>

      {/* Message si pas de données */}
      {(!stats.tickets || stats.tickets.total === 0) && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune donnée disponible</h3>
          <p className="text-gray-500">
            Les analytics s'afficheront une fois que des tickets seront créés et traités.
          </p>
        </div>
      )}

      {/* Répartition des tickets par agent et par priorité */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Par agent */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Répartition des tickets par agent</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={ticketsByAgent}
                  dataKey="count"
                  nameKey="full_name"
                  label={({ full_name, count, agent }) => `${full_name || '(Inconnu)'}: ${count}`}
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                >
                  {ticketsByAgent.map((entry, idx) => (
                    <Cell key={`cell-agent-${idx}`} fill={["#2563eb", "#22c55e", "#f59e42", "#ef4444", "#a21caf"][idx % 5]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        {/* Par priorité */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Répartition des tickets par priorité</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={ticketsByPriority}
                  dataKey="count"
                  nameKey="priority"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ priority, count }) => `${priority}: ${count}`}
                >
                  {ticketsByPriority.map((entry, idx) => (
                    <Cell key={`cell-priority-${idx}`} fill={["#2563eb", "#f59e42", "#ef4444", "#22c55e", "#a21caf"][idx % 5]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;