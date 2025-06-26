import React, { useState, useEffect } from 'react';
import { Settings, X, Plus, Save, LayoutGrid, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { useUser } from '../../hooks/useUser';
import StatsCard from './StatsCard';
import TicketCard from '../Tickets/TicketCard';
import { ticketService } from '../../services/ticketService';

interface DashboardWidget {
  id: string;
  type: string;
  title: string;
  size: 'small' | 'medium' | 'large';
  position: number;
  visible: boolean;
  config?: any;
}

const CustomizableDashboard: React.FC = () => {
  const { user } = useUser();
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [availableWidgets, setAvailableWidgets] = useState<DashboardWidget[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadDashboardConfig();
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const [ticketsData, statsData] = await Promise.all([
        ticketService.getTickets(user?.id, user?.role),
        ticketService.getTicketStats(user?.id, user?.role)
      ]);
      
      setTickets(ticketsData?.slice(0, 5) || []);
      setStats(statsData || {});
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    }
  };

  const loadDashboardConfig = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Récupérer la configuration du dashboard de l'utilisateur
      const { data: userConfig, error: userConfigError } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', `dashboard_config_${user?.id}`)
        .single();

      if (userConfigError && userConfigError.code !== 'PGRST116') { // PGRST116 means no rows found
        throw userConfigError;
      }

      // Si l'utilisateur a une configuration personnalisée
      if (userConfig && userConfig.value) {
        let parsedConfig;
        try {
          // Essayer de parser la valeur comme JSON
          if (typeof userConfig.value === 'string') {
            parsedConfig = JSON.parse(userConfig.value);
          } else {
            parsedConfig = userConfig.value;
          }
          setWidgets(parsedConfig);
        } catch (parseError) {
          console.error('Erreur de parsing JSON:', parseError);
          setWidgets(getDefaultWidgets(user?.role || 'client'));
        }
      } else {
        // Sinon, charger la configuration par défaut selon le rôle
        setWidgets(getDefaultWidgets(user?.role || 'client'));
      }

      // Charger les widgets disponibles
      setAvailableWidgets(getAllAvailableWidgets(user?.role || 'client'));
    } catch (err) {
      console.error('Erreur lors du chargement de la configuration:', err);
      setError('Impossible de charger la configuration du tableau de bord');
      setWidgets(getDefaultWidgets(user?.role || 'client'));
    } finally {
      setIsLoading(false);
    }
  };

  const saveDashboardConfig = async () => {
    if (!user) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const { error } = await supabase
        .from('system_settings')
        .upsert({
          key: `dashboard_config_${user.id}`,
          value: JSON.stringify(widgets),
          description: 'Configuration du tableau de bord personnalisé',
          updated_by: user.id,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'key'
        });

      if (error) {
        console.error('Erreur lors de la sauvegarde:', error);
        setError(`Erreur lors de la sauvegarde: ${error.message}`);
        return;
      }

      setSuccess('Configuration sauvegardée avec succès !');
      setIsEditing(false);
      
      // Effacer le message de succès après 3 secondes
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
      
      // Recharger les paramètres pour s'assurer de la cohérence
      setTimeout(() => {
        loadDashboardConfig();
      }, 500);

    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      setError(`Erreur lors de la sauvegarde: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setSaving(false);
    }
  };

  const getDefaultWidgets = (role: string): DashboardWidget[] => {
    if (role === 'client') {
      return [
        { id: 'tickets-stats', type: 'stats', title: 'Statistiques des tickets', size: 'large', position: 0, visible: true },
        { id: 'recent-tickets', type: 'recent-tickets', title: 'Tickets récents', size: 'large', position: 1, visible: true },
        { id: 'quick-actions', type: 'quick-actions', title: 'Actions rapides', size: 'medium', position: 2, visible: true },
        { id: 'knowledge-base', type: 'knowledge-base', title: 'Articles populaires', size: 'medium', position: 3, visible: true }
      ];
    } else {
      return [
        { id: 'agent-stats', type: 'stats', title: 'Statistiques', size: 'large', position: 0, visible: true },
        { id: 'priority-tickets', type: 'priority-tickets', title: 'Tickets prioritaires', size: 'large', position: 1, visible: true },
        { id: 'team-status', type: 'team-status', title: 'Équipe en ligne', size: 'medium', position: 2, visible: true },
        { id: 'performance', type: 'performance', title: 'Performance', size: 'medium', position: 3, visible: true }
      ];
    }
  };

  const getAllAvailableWidgets = (role: string): DashboardWidget[] => {
    if (role === 'client') {
      return [
        { id: 'tickets-stats', type: 'stats', title: 'Statistiques des tickets', size: 'large', position: 0, visible: true },
        { id: 'recent-tickets', type: 'recent-tickets', title: 'Tickets récents', size: 'large', position: 1, visible: true },
        { id: 'quick-actions', type: 'quick-actions', title: 'Actions rapides', size: 'medium', position: 2, visible: true },
        { id: 'knowledge-base', type: 'knowledge-base', title: 'Articles populaires', size: 'medium', position: 3, visible: true },
        { id: 'ai-assistant', type: 'ai-assistant', title: 'Assistant IA', size: 'medium', position: 4, visible: false },
        { id: 'notifications', type: 'notifications', title: 'Notifications récentes', size: 'medium', position: 5, visible: false },
        { id: 'tips', type: 'tips', title: 'Conseils du jour', size: 'small', position: 6, visible: false }
      ];
    } else {
      return [
        { id: 'agent-stats', type: 'stats', title: 'Statistiques', size: 'large', position: 0, visible: true },
        { id: 'priority-tickets', type: 'priority-tickets', title: 'Tickets prioritaires', size: 'large', position: 1, visible: true },
        { id: 'team-status', type: 'team-status', title: 'Équipe en ligne', size: 'medium', position: 2, visible: true },
        { id: 'performance', type: 'performance', title: 'Performance', size: 'medium', position: 3, visible: true },
        { id: 'unassigned-tickets', type: 'unassigned-tickets', title: 'Tickets non assignés', size: 'medium', position: 4, visible: false },
        { id: 'recent-activity', type: 'recent-activity', title: 'Activité récente', size: 'medium', position: 5, visible: false },
        { id: 'satisfaction-ratings', type: 'satisfaction-ratings', title: 'Évaluations de satisfaction', size: 'medium', position: 6, visible: false },
        { id: 'knowledge-base-stats', type: 'knowledge-base-stats', title: 'Statistiques base de connaissances', size: 'small', position: 7, visible: false }
      ];
    }
  };

  const toggleWidgetVisibility = (widgetId: string) => {
    setWidgets(prev => 
      prev.map(widget => 
        widget.id === widgetId 
          ? { ...widget, visible: !widget.visible } 
          : widget
      )
    );
  };

  const addWidget = (widgetId: string) => {
    const widgetToAdd = availableWidgets.find(w => w.id === widgetId);
    if (!widgetToAdd) return;

    const isAlreadyAdded = widgets.some(w => w.id === widgetId);
    if (isAlreadyAdded) {
      // Si le widget existe déjà, le rendre visible
      toggleWidgetVisibility(widgetId);
    } else {
      // Sinon, l'ajouter à la liste
      setWidgets(prev => [
        ...prev, 
        { 
          ...widgetToAdd, 
          position: prev.length,
          visible: true
        }
      ]);
    }
  };

  const renderWidget = (widget: DashboardWidget) => {
    if (!widget.visible) return null;

    switch (widget.type) {
      case 'stats':
        return (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistiques</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.ouvert || 0}</div>
                <div className="text-sm text-gray-600">Ouverts</div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-yellow-600">{stats.en_cours || 0}</div>
                <div className="text-sm text-gray-600">En cours</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{stats.resolu || 0}</div>
                <div className="text-sm text-gray-600">Résolus</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.total || 0}</div>
                <div className="text-sm text-gray-600">Total</div>
              </div>
            </div>
          </div>
        );
      
      case 'recent-tickets':
      case 'priority-tickets':
        return (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{widget.title}</h3>
              <button 
                onClick={() => {
                  localStorage.setItem('activeSection', 'tickets');
                  window.location.reload();
                }}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Voir tout
              </button>
            </div>
            {tickets.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Aucun ticket à afficher
              </div>
            ) : (
              <div className="space-y-4">
                {tickets.slice(0, 3).map(ticket => (
                  <div key={ticket.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{ticket.title}</h4>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        ticket.status === 'ouvert' ? 'bg-blue-100 text-blue-800' :
                        ticket.status === 'en_cours' ? 'bg-yellow-100 text-yellow-800' :
                        ticket.status === 'resolu' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {ticket.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-2">{ticket.description}</p>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>#{ticket.id.substring(0, 8)}</span>
                      <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      
      case 'quick-actions':
        return (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{widget.title}</h3>
            <div className="space-y-3">
              <button 
                onClick={() => {
                  localStorage.setItem('activeSection', 'tickets');
                  window.location.reload();
                }}
                className="w-full p-3 text-left bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                <div className="font-medium text-blue-900">Créer un ticket</div>
                <div className="text-sm text-blue-600">Soumettre une nouvelle demande</div>
              </button>
              <button 
                onClick={() => {
                  localStorage.setItem('activeSection', 'knowledge');
                  window.location.reload();
                }}
                className="w-full p-3 text-left bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
              >
                <div className="font-medium text-green-900">Consulter la base de connaissances</div>
                <div className="text-sm text-green-600">Trouver des solutions</div>
              </button>
              <button 
                onClick={() => {
                  localStorage.setItem('activeSection', 'ai-assistant');
                  window.location.reload();
                }}
                className="w-full p-3 text-left bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
              >
                <div className="font-medium text-purple-900">Contacter l'assistance</div>
                <div className="text-sm text-purple-600">Discuter avec un agent</div>
              </button>
            </div>
          </div>
        );
      
      case 'knowledge-base':
        return (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{widget.title}</h3>
            <div className="space-y-3">
              <div 
                className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => {
                  localStorage.setItem('activeSection', 'knowledge');
                  window.location.reload();
                }}
              >
                <h4 className="font-medium text-gray-900">Comment créer un ticket</h4>
                <p className="text-sm text-gray-600 mt-1">Guide pas à pas pour soumettre une demande</p>
              </div>
              <div 
                className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => {
                  localStorage.setItem('activeSection', 'knowledge');
                  window.location.reload();
                }}
              >
                <h4 className="font-medium text-gray-900">Résoudre les problèmes de connexion</h4>
                <p className="text-sm text-gray-600 mt-1">Solutions aux problèmes d'accès courants</p>
              </div>
              <div 
                className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => {
                  localStorage.setItem('activeSection', 'knowledge');
                  window.location.reload();
                }}
              >
                <h4 className="font-medium text-gray-900">FAQ - Questions fréquentes</h4>
                <p className="text-sm text-gray-600 mt-1">Réponses aux questions les plus posées</p>
              </div>
            </div>
          </div>
        );
      
      case 'team-status':
        return (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{widget.title}</h3>
            <div className="space-y-3">
              {/* Afficher les agents réels si disponibles */}
              {stats.agents && stats.agents > 0 ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white">
                      A
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">Agent</div>
                      <div className="text-xs text-gray-500">En ligne</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs text-gray-500">En ligne</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  Aucun agent en ligne actuellement
                </div>
              )}
            </div>
          </div>
        );
      
      case 'performance':
        return (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{widget.title}</h3>
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
                  <span className="text-gray-600">Temps moyen de résolution</span>
                  <span className="font-medium">-</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-yellow-500 h-2 rounded-full" 
                    style={{ width: '0%' }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'ai-assistant':
        return (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{widget.title}</h3>
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-700">Comment puis-je vous aider aujourd'hui ?</p>
            </div>
            <div className="flex space-x-2">
              <input 
                type="text" 
                placeholder="Posez une question..."
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button 
                onClick={() => {
                  localStorage.setItem('activeSection', 'ai-assistant');
                  window.location.reload();
                }}
                className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
              >
                Envoyer
              </button>
            </div>
          </div>
        );
      
      case 'notifications':
        return (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{widget.title}</h3>
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800 font-medium">Nouveau ticket assigné</p>
                <p className="text-xs text-blue-600 mt-1">Il y a 2 heures</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm text-green-800 font-medium">Ticket #12345 résolu</p>
                <p className="text-xs text-green-600 mt-1">Il y a 1 jour</p>
              </div>
              <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-sm text-yellow-800 font-medium">Rappel: 3 tickets en attente</p>
                <p className="text-xs text-yellow-600 mt-1">Il y a 3 jours</p>
              </div>
            </div>
          </div>
        );
      
      case 'unassigned-tickets':
        return (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{widget.title}</h3>
            <div className="space-y-3">
              <div className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex justify-between mb-1">
                  <h4 className="font-medium text-gray-900">Problème de connexion VPN</h4>
                  <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded-full text-xs">Urgent</span>
                </div>
                <p className="text-sm text-gray-600 mb-2 line-clamp-1">Impossible de se connecter au VPN depuis ce matin...</p>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Client: Jean Dupont</span>
                  <span>Il y a 30 min</span>
                </div>
              </div>
              <div className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex justify-between mb-1">
                  <h4 className="font-medium text-gray-900">Erreur d'impression</h4>
                  <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-xs">Normal</span>
                </div>
                <p className="text-sm text-gray-600 mb-2 line-clamp-1">L'imprimante affiche une erreur de papier...</p>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Client: Marie Martin</span>
                  <span>Il y a 2h</span>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'satisfaction-ratings':
        return (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{widget.title}</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs">5</div>
                  <span className="text-sm text-gray-600">5 étoiles</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '68%' }}></div>
                  </div>
                  <span className="text-sm font-medium">68%</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs">4</div>
                  <span className="text-sm text-gray-600">4 étoiles</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: '22%' }}></div>
                  </div>
                  <span className="text-sm font-medium">22%</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-yellow-500 text-white rounded-full flex items-center justify-center text-xs">3</div>
                  <span className="text-sm text-gray-600">3 étoiles</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '7%' }}></div>
                  </div>
                  <span className="text-sm font-medium">7%</span>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'recent-activity':
        return (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{widget.title}</h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm">JD</div>
                <div>
                  <p className="text-sm text-gray-900">Jean Dupont a créé un nouveau ticket</p>
                  <p className="text-xs text-gray-500">Il y a 30 minutes</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm">MM</div>
                <div>
                  <p className="text-sm text-gray-900">Marie Martin a résolu le ticket #12345</p>
                  <p className="text-xs text-gray-500">Il y a 2 heures</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm">PL</div>
                <div>
                  <p className="text-sm text-gray-900">Pierre Legrand a ajouté un commentaire</p>
                  <p className="text-xs text-gray-500">Il y a 3 heures</p>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'knowledge-base-stats':
        return (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{widget.title}</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Articles publiés</span>
                <span className="text-sm font-medium">24</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Vues totales</span>
                <span className="text-sm font-medium">1,245</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Article le plus vu</span>
                <span className="text-sm font-medium">342 vues</span>
              </div>
            </div>
          </div>
        );
      
      case 'tips':
        return (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{widget.title}</h3>
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="font-medium text-yellow-900 mb-1">💡 Astuce</div>
              <div className="text-sm text-yellow-700">
                Utilisez notre assistant IA pour créer des tickets plus détaillés et obtenir des solutions plus rapidement.
              </div>
            </div>
          </div>
        );
      
      default:
        return (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{widget.title}</h3>
            <div className="text-center py-8 text-gray-500">
              Contenu du widget non disponible
            </div>
          </div>
        );
    }
  };

  const getWidgetSizeClass = (size: string) => {
    switch (size) {
      case 'small': return 'col-span-1';
      case 'medium': return 'col-span-1 md:col-span-1';
      case 'large': return 'col-span-1 md:col-span-2';
      default: return 'col-span-1';
    }
  };

  if (isLoading) {
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
          <h1 className="text-3xl font-bold text-gray-900">Tableau de Bord Personnalisé</h1>
          <p className="text-gray-600 mt-2">Configurez votre espace de travail selon vos préférences</p>
        </div>
        
        <div className="flex items-center space-x-3">
          {isEditing ? (
            <>
              <button
                onClick={saveDashboardConfig}
                disabled={saving}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>Enregistrer</span>
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
              >
                <X className="w-4 h-4" />
                <span>Annuler</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span>Personnaliser</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <span className="text-green-700">{success}</span>
        </div>
      )}

      {isEditing ? (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Widgets actifs</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {widgets.map((widget) => (
                <div 
                  key={widget.id} 
                  className={`border border-gray-200 rounded-lg p-4 bg-white shadow-sm ${widget.visible ? '' : 'opacity-50'}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className="widget-handle cursor-move p-1 hover:bg-gray-100 rounded">
                        <LayoutGrid className="w-4 h-4 text-gray-500" />
                      </div>
                      <span className="font-medium text-gray-900">{widget.title}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => toggleWidgetVisibility(widget.id)}
                        className="p-1 hover:bg-gray-100 rounded"
                        title={widget.visible ? "Masquer" : "Afficher"}
                      >
                        {widget.visible ? (
                          <EyeOff className="w-4 h-4 text-gray-500" />
                        ) : (
                          <Eye className="w-4 h-4 text-gray-500" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 flex justify-between">
                    <span>Type: {widget.type}</span>
                    <span>Taille: {widget.size}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Widgets disponibles</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableWidgets
                .filter(w => !widgets.some(userWidget => userWidget.id === w.id))
                .map((widget) => (
                  <div 
                    key={widget.id} 
                    className="border border-gray-200 rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">{widget.title}</span>
                      <button
                        onClick={() => addWidget(widget.id)}
                        className="p-1 bg-blue-100 hover:bg-blue-200 rounded text-blue-600"
                        title="Ajouter"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="text-xs text-gray-500">
                      Type: {widget.type} | Taille: {widget.size}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {widgets
            .filter(widget => widget.visible)
            .sort((a, b) => a.position - b.position)
            .map((widget) => (
              <div 
                key={widget.id} 
                className={`${getWidgetSizeClass(widget.size)}`}
              >
                {renderWidget(widget)}
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default CustomizableDashboard;