import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useUser } from './hooks/useUser';
import { useNotifications } from './hooks/useNotifications';
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';
import LoginPage from './components/Auth/LoginPage';
import ClientDashboard from './components/Dashboard/ClientDashboard';
import AgentDashboard from './components/Dashboard/AgentDashboard';
import ChatBot from './components/AIAssistant/ChatBot';
import TicketManagement from './components/Tickets/TicketManagement';
import KnowledgeBase from './components/Knowledge/KnowledgeBase';
import UserManagement from './components/Users/UserManagement';
import UserProfilePage from './components/Users/UserProfilePage';
import AnalyticsDashboard from './components/Analytics/AnalyticsDashboard';
import SettingsPage from './components/Settings/SettingsPage';

import FaqPage from './pages/FaqPage';
// import { ShareHandler, usePushNotifications } from './components/PWA/PWAHandlers';
// import { useFileHandler } from './components/PWA/PWAHandlers';
import Footer from './components/Layout/Footer';
import { supabase } from './utils/supabase';
import OnboardingModal from './components/Users/OnboardingModal';

function App() {
  const { user, loading, error } = useUser();
  const { requestNotificationPermission, refresh: refreshNotifications } = useNotifications();
  // const { } = usePushNotifications(); // TEMPORAIREMENT DÉSACTIVÉ

  const navigate = useNavigate();
  const location = useLocation();

  // Gestion du callback OAuth (Microsoft, Google, etc.)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code && !user && !loading) {
      // Ici, on suppose que useUser() va gérer l'échange du code côté backend/Supabase
      // On attend simplement que user soit défini, puis on nettoie l'URL
      return;
    }
    if (code && user) {
      // Redirige vers la page principale selon le rôle
      if (user.role === 'client') {
        window.history.replaceState({}, '', '/dashboard');
        navigate('/dashboard', { replace: true });
      } else {
        window.history.replaceState({}, '', '/');
        navigate('/', { replace: true });
      }
    }
  }, [user, loading, navigate]);
  const [activeSection, setActiveSection] = useState(() => {
    // Récupérer la section active depuis l'URL
    const path = window.location.pathname;
    if (path.startsWith('/tickets')) return 'tickets';
    if (path.startsWith('/dashboard')) return 'dashboard';
    if (path.startsWith('/knowledge')) return 'knowledge';
    if (path.startsWith('/users')) return 'users';
    if (path.startsWith('/analytics')) return 'analytics';
    if (path.startsWith('/settings')) return 'settings';
    if (path.startsWith('/faq')) return 'faq';
    if (path.startsWith('/ai-assistant')) return 'ai-assistant';
    return 'dashboard';
  });

  // Synchroniser activeSection avec l'URL (back/forward navigateur)
  useEffect(() => {
    const path = location.pathname;
    let section = 'dashboard';
    if (path.startsWith('/tickets')) section = 'tickets';
    else if (path.startsWith('/dashboard')) section = 'dashboard';
    else if (path.startsWith('/knowledge')) section = 'knowledge';
    else if (path.startsWith('/users')) section = 'users';
    else if (path.startsWith('/analytics')) section = 'analytics';
    else if (path.startsWith('/settings')) section = 'settings';
    else if (path.startsWith('/faq')) section = 'faq';
    else if (path.startsWith('/ai-assistant')) section = 'ai-assistant';
    setActiveSection(section);
  }, [location.pathname]);
  const [settingsActiveTab, setSettingsActiveTab] = useState(() => {
    // Récupérer l'onglet actif des paramètres depuis le localStorage
    return localStorage.getItem('settingsActiveTab') || 'general';
  });
  const [subscriptionsInitialized, setSubscriptionsInitialized] = useState(false);

  // Initialize PWA handlers - TEMPORAIREMENT DÉSACTIVÉ
  // useFileHandler();

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

  if (user && user.onboarded === false) {
    return (
      <OnboardingModal user={user} onOnboardingComplete={() => window.location.reload()} />
    );
  }

  const handleSectionChange = (section: string, subSection?: string) => {
    setActiveSection(section);
    if (section === 'settings' && subSection) {
      setSettingsActiveTab(subSection);
    } else {
      setSettingsActiveTab('general'); // Réinitialiser l'onglet si ce n'est pas les paramètres
    }
  };


  // Pour la route /tickets/:id, on affiche TicketManagement avec un paramètre
  // et on force l'ouverture du ticket correspondant

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar 
        userRole={user.role} 
        activeSection={activeSection} 
        onSectionChange={handleSectionChange} 
      />
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <Header 
          title={activeSection === 'dashboard' ? 'Tableau de Bord' : 'HelpDesk'} 
          user={user}
        />
        <main className="flex-1 overflow-y-auto main-scroll-area">
          <div className="p-6">
            <Routes>
              <Route path="/" element={user.role === 'client' ? <ClientDashboard /> : <AgentDashboard />} />
              <Route path="/dashboard" element={user.role === 'client' ? <ClientDashboard /> : <AgentDashboard />} />
              <Route path="/ai-assistant" element={<><h1 className="text-3xl font-bold text-gray-900">Assistant IA</h1><p className="text-gray-600 mt-2">Obtenez de l'aide instantanée avec notre assistant intelligent</p><ChatBot /></>} />
              <Route path="/tickets" element={<TicketManagement />} />
              <Route path="/tickets/:ticketId" element={<TicketManagement />} />
              <Route path="/tickets/:ticketId/details" element={<TicketManagement />} />
              <Route path="/tickets/:ticketId/messages" element={<TicketManagement />} />
              <Route path="/tickets/:ticketId/files" element={<TicketManagement />} />
              <Route path="/knowledge" element={<KnowledgeBase />} />
              <Route path="/users" element={<UserManagement />} />
              <Route path="/users/:userId" element={<UserProfilePage />} />
              <Route path="/analytics" element={<AnalyticsDashboard />} />
              <Route path="/settings" element={<SettingsPage initialActiveTab={settingsActiveTab} />} />
              <Route path="/settings/:tab" element={<SettingsPage />} />

              <Route path="/faq" element={<FaqPage />} />
              <Route path="*" element={user.role === 'client' ? <ClientDashboard /> : <AgentDashboard />} />
            </Routes>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}

export default App;