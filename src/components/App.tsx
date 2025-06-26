import React, { useState, useEffect } from 'react';
import { useUser } from './hooks/useUser';
import { useNotifications } from './hooks/useNotifications';
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';
import LoginPage from './components/Auth/LoginPage';
import ClientDashboard from './components/Dashboard/ClientDashboard';
import AgentDashboard from './components/Dashboard/AgentDashboard';
import ChatBot from './components/AIAssistant/ChatBot';
import IntelligentSupportSystem from './components/AIAssistant/IntelligentSupportSystem';
import TicketManagement from './components/Tickets/TicketManagement';
import KnowledgeBase from './components/Knowledge/KnowledgeBase';
import UserManagement from './components/Users/UserManagement';
import AnalyticsDashboard from './components/Analytics/AnalyticsDashboard';
import SettingsPage from './components/Settings/SettingsPage';
import { supabase } from './utils/supabase';
import { MessageSquare } from 'lucide-react';

function App() {
  const { user, loading, error } = useUser();
  const { requestNotificationPermission, refresh: refreshNotifications } = useNotifications();
  const [activeSection, setActiveSection] = useState(() => {
    // Récupérer la section active depuis le localStorage
    return localStorage.getItem('activeSection') || 'dashboard';
  });
  const [settingsActiveTab, setSettingsActiveTab] = useState(() => {
    // Récupérer l'onglet actif des paramètres depuis le localStorage
    return localStorage.getItem('settingsActiveTab') || 'general';
  });
  const [subscriptionsInitialized, setSubscriptionsInitialized] = useState(false);

  // Effet pour la visibilité de la page
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        // Rafraîchir les données quand l'utilisateur revient sur l'onglet
        refreshNotifications();
        
        // Rafraîchir les tickets si on est sur la page des tickets
        if (activeSection === 'tickets') {
          // Émettre un événement personnalisé pour rafraîchir les tickets
          window.dispatchEvent(new CustomEvent('refreshTickets'));
        }
        
        // Rafraîchir le dashboard si on est sur la page dashboard
        if (activeSection === 'dashboard') {
          window.dispatchEvent(new CustomEvent('refreshDashboard'));
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, activeSection, refreshNotifications]);

  // Configurer les abonnements en temps réel
  useEffect(() => {
    if (!user || subscriptionsInitialized) return;

    // Créer des noms de canaux uniques avec un timestamp pour éviter les conflits
    const timestamp = Date.now();
    const ticketsChannelName = `tickets-changes-${timestamp}`;
    const messagesChannelName = `messages-changes-${timestamp}`;

    console.log('Initialisation des abonnements Supabase...');

    // Abonnement aux nouveaux tickets
    const ticketsSubscription = supabase
      .channel(ticketsChannelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets'
        },
        (payload) => {
          console.log('Changement détecté sur les tickets:', payload);
          
          // Rafraîchir les tickets si on est sur la page des tickets
          if (activeSection === 'tickets') {
            window.dispatchEvent(new CustomEvent('refreshTickets'));
          }
          
          // Rafraîchir le dashboard dans tous les cas
          window.dispatchEvent(new CustomEvent('refreshDashboard'));
        }
      )
      .subscribe();

    // Abonnement aux nouveaux messages
    const messagesSubscription = supabase
      .channel(messagesChannelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          console.log('Nouveau message détecté:', payload);
          
          // Rafraîchir les tickets si on est sur la page des tickets
          if (activeSection === 'tickets') {
            window.dispatchEvent(new CustomEvent('refreshTickets'));
          }
          
          // Émettre un événement pour le ticket spécifique
          if (payload.new && payload.new.ticket_id) {
            window.dispatchEvent(new CustomEvent('newMessage', { 
              detail: { ticketId: payload.new.ticket_id }
            }));
          }
        }
      )
      .subscribe();

    setSubscriptionsInitialized(true);

    return () => {
      console.log('Nettoyage des abonnements Supabase...');
      ticketsSubscription.unsubscribe();
      messagesSubscription.unsubscribe();
    };
  }, [user, subscriptionsInitialized]);

  useEffect(() => {
    // Demander la permission pour les notifications natives seulement une fois
    if (user && !loading) {
      requestNotificationPermission();
    }
  }, [user?.id, loading]);

  // Sauvegarder la section active dans le localStorage
  useEffect(() => {
    if (activeSection) {
      localStorage.setItem('activeSection', activeSection);
    }
    if (settingsActiveTab) {
      localStorage.setItem('settingsActiveTab', settingsActiveTab);
    }
  }, [activeSection, settingsActiveTab]);

  // Charger les paramètres d'apparence au démarrage
  useEffect(() => {
    const loadAppearanceSettings = async () => {
      try {
        const { data: settings } = await supabase
          .from('system_settings')
          .select('key, value')
          .in('key', ['primary_color', 'secondary_color', 'organization_name']);

        if (settings) {
          const settingsMap = settings.reduce((acc, setting) => {
            acc[setting.key] = setting.value;
            return acc;
          }, {} as Record<string, string>);

          if (settingsMap.primary_color) {
            document.documentElement.style.setProperty('--color-primary', settingsMap.primary_color);
          }
          if (settingsMap.secondary_color) {
            document.documentElement.style.setProperty('--color-secondary', settingsMap.secondary_color);
          }
          
          if (settingsMap.organization_name) {
            document.title = `HelpDesk - ${settingsMap.organization_name}`;
          }
        }
      } catch (error) {
        console.log('Paramètres d\'apparence non disponibles:', error);
      }
    };

    loadAppearanceSettings();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Erreur de chargement</h2>
            <p className="text-red-600 text-sm mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
            >
              Recharger la page
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const handleSectionChange = (section: string, subSection?: string) => {
    setActiveSection(section);
    if (section === 'settings' && subSection) {
      setSettingsActiveTab(subSection);
    } else {
      setSettingsActiveTab('general'); // Réinitialiser l'onglet si ce n'est pas les paramètres
    }
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return user.role === 'client' ? <ClientDashboard /> : <AgentDashboard />;
      
      case 'ai-assistant':
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Assistant IA</h1>
              <p className="text-gray-600 mt-2">Obtenez de l'aide instantanée ou créez un ticket avec notre assistant intelligent</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Assistant Conversationnel</h2>
                <ChatBot />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Création de Ticket Intelligente</h2>
                <IntelligentSupportSystem />
              </div>
            </div>
          </div>
        );
      
      case 'tickets':
        return <TicketManagement />;
      
      case 'messages':
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Centre de Messages</h1>
              <p className="text-gray-600 mt-2">Accédez aux messages via les détails des tickets</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Messages des tickets</h3>
              <p className="text-gray-500 mb-4">
                Pour accéder aux messages, ouvrez un ticket depuis la section "Tickets" et cliquez sur "Voir détails".
              </p>
              <button
                onClick={() => handleSectionChange('tickets')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Aller aux tickets
              </button>
            </div>
          </div>
        );
      
      case 'knowledge':
        return <KnowledgeBase />;
      
      case 'users':
        return <UserManagement />;
      
      case 'analytics':
        return <AnalyticsDashboard />;
      
      case 'settings':
        return <SettingsPage initialActiveTab={settingsActiveTab} />;
      
      default:
        return user.role === 'client' ? <ClientDashboard /> : <AgentDashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar 
        userRole={user.role} 
        activeSection={activeSection} 
        onSectionChange={handleSectionChange} 
        settingsActiveTab={settingsActiveTab} // Passer settingsActiveTab à Sidebar
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title={activeSection === 'dashboard' ? 'Tableau de Bord' : 'HelpDesk'} 
          user={{
            name: user.full_name || user.email,
            email: user.email,
            avatar_url: user.avatar_url
          }}
        />
        
        <main className="flex-1 overflow-y-auto p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default App;