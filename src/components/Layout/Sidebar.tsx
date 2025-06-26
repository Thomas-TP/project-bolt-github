import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home,
  Ticket,
  BookOpen,
  Users,
  BarChart3,
  Settings,
  Bot,
  LogOut,
  Mail,
  // Network,
  Pin,
  PinOff,
  ChevronRight
} from 'lucide-react';
import { authService } from '../../utils/supabase';
import { useNotifications } from '../../hooks/useNotifications';

interface SidebarProps {
  userRole: 'client' | 'agent' | 'admin';
  activeSection: string;
  onSectionChange: (section: string, subSection?: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ userRole, activeSection, onSectionChange }) => {
  const navigate = useNavigate();
  // Version 2.1 - Fixed icon centering alignment
  const [organizationName, setOrganizationName] = useState('Geneva Institute of Technology');
  const [primaryColor, setPrimaryColor] = useState('#ef4444');
  const [secondaryColor, setSecondaryColor] = useState('#f59e0b');
  const [isPinned, setIsPinned] = useState(() => {
    return localStorage.getItem('sidebar-pinned') === 'true';
  });
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const { unreadCount } = useNotifications();

  // Déterminer si la sidebar doit être étendue
  useEffect(() => {
    if (isPinned) {
      setIsExpanded(true);
    } else {
      setIsExpanded(isHovered);
    }
  }, [isPinned, isHovered]);

  // Sauvegarder l'état d'ancrage dans localStorage
  useEffect(() => {
    localStorage.setItem('sidebar-pinned', isPinned.toString());
  }, [isPinned]);

  useEffect(() => {
    // Écouter les changements d'apparence
    const handleAppearanceChange = (event: CustomEvent) => {
      if (event.detail.organizationName) {
        setOrganizationName(event.detail.organizationName);
      }
      if (event.detail.primaryColor) {
        setPrimaryColor(event.detail.primaryColor);
      }
      if (event.detail.secondaryColor) {
        setSecondaryColor(event.detail.secondaryColor);
      }
    };

    window.addEventListener('appearanceChanged', handleAppearanceChange as EventListener);
    
    return () => {
      window.removeEventListener('appearanceChanged', handleAppearanceChange as EventListener);
    };
  }, []);

  const togglePin = () => {
    setIsPinned(!isPinned);
  };

  const handleMouseEnter = () => {
    if (!isPinned) {
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isPinned) {
      setIsHovered(false);
    }
  };

  const handleSignOut = async () => {
    await authService.signOut();
    window.location.href = '/';
  };

  // Map section id to route path (doit être en dehors de getMenuItems pour être accessible partout)
  const sectionToRoute = (id: string, subTab?: string) => {
    switch (id) {
      case 'dashboard': return '/dashboard';
      case 'tickets': return '/tickets';
      case 'knowledge': return '/knowledge';
      case 'ai-assistant': return '/ai-assistant';
      case 'faq': return '/faq';
      // case 'network': return '/network';
      case 'users': return '/users';
      case 'analytics': return '/analytics';
      case 'settings': return '/settings';
      case 'email-config': return '/settings'; // handled as settings with tab
      default: return '/';
    }
  };
  const getMenuItems = () => {
    const commonItems = [
      { id: 'dashboard', label: 'Tableau de Bord', icon: Home },
      { id: 'tickets', label: 'Tickets', icon: Ticket },
      { id: 'knowledge', label: 'Base de Connaissances', icon: BookOpen },
      { id: 'ai-assistant', label: 'Assistant IA', icon: Bot },
      { id: 'faq', label: 'FAQ', icon: BookOpen }
    ];

    if (userRole === 'client') {
      return commonItems;
    }

    const agentItems = [
      ...commonItems,
      // { id: 'network', label: 'Réseau', icon: Network }
    ];

    if (userRole === 'admin') {
      return [
        ...agentItems,
        { id: 'users', label: 'Utilisateurs', icon: Users },
        { id: 'analytics', label: 'Analytiques', icon: BarChart3 },
        { id: 'settings', label: 'Paramètres', icon: Settings }
      ];
    }

    return agentItems;
  };

  const isMenuItemActive = (item: any) => {
    if (item.targetSection) {
      return activeSection === item.targetSection;
    }
    return activeSection === item.id;
  };

  return (
    <div 
      className={`bg-white shadow-lg border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out relative ${
        isExpanded ? 'w-64' : 'w-16'
      }`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Bouton d'ancrage */}
      <div className="absolute top-4 right-2 z-10">
        <button
          onClick={togglePin}
          className={`p-1.5 rounded-lg transition-all duration-200 ${
            isPinned 
              ? 'bg-red-100 text-red-600 hover:bg-red-200' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          } ${isExpanded ? 'opacity-100' : 'opacity-0 hover:opacity-100'}`}
          title={isPinned ? 'Détacher la sidebar' : 'Ancrer la sidebar'}
        >
          {isPinned ? <Pin className="w-4 h-4" /> : <PinOff className="w-4 h-4" />}
        </button>
      </div>

      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 flex-shrink-0">
            <img 
              src="/logo.png" 
              alt="Logo" 
              className="w-10 h-10 rounded-lg object-contain"
            />
          </div>
          <div className={`transition-all duration-300 ${isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden'}`}>
            <h1 className="text-lg font-bold text-gray-900 whitespace-nowrap">
              <span style={{ color: primaryColor }}>Help</span>
              <span style={{ color: secondaryColor }}>Desk</span>
            </h1>
            <p className="text-xs text-gray-600 capitalize font-medium whitespace-nowrap">{userRole}</p>
          </div>
          {!isExpanded && (
            <ChevronRight className="w-4 h-4 text-gray-400 absolute right-2" />
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-hidden">
        {getMenuItems().map((item) => (
          <div key={item.id} className="relative group">
            <button
              onClick={() => {
                // Navigue vers la bonne route
                const section = (item as any).targetSection || item.id;
                const tab = (item as any).targetTab;
                const route = sectionToRoute(section, tab);
                navigate(route);
                // Pour settings/email-config, on gère l'onglet via onSectionChange
                onSectionChange(section, tab);
              }}
              className={`w-full flex items-center px-3 py-2.5 h-12 rounded-lg text-left transition-all duration-200 text-sm ${
                isMenuItemActive(item)
                  ? 'shadow-sm'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
              }`}
              style={isMenuItemActive(item) ? {
                background: `linear-gradient(135deg, ${primaryColor}15, ${secondaryColor}15)`,
                color: primaryColor,
                borderRight: `4px solid ${primaryColor}`
              } : {}}
            >
              <div className="w-5 h-5 flex items-center justify-center flex-shrink-0 relative">
                <item.icon className="!w-5 !h-5" />
                {item.id === 'tickets' && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white text-xs rounded-full flex items-center justify-center font-bold shadow" style={{ fontSize: '0.7rem' }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              <span className={`font-medium transition-all duration-300 ${
                isExpanded ? 'opacity-100 w-auto ml-3 h-auto' : 'opacity-0 w-0 h-0 overflow-hidden'
              }`}>
                {item.label}
              </span>
            </button>
            
            {/* Tooltip pour mode réduit */}
            {!isExpanded && (
              <div className="absolute left-full top-1/2 transform -translate-y-1/2 ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                {item.label}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200 flex-shrink-0">
        <div className={`mb-2 p-2 bg-gray-50 rounded-lg transition-all duration-300 ${
          isExpanded ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden mb-0'
        }`}>
          <p className="text-xs text-gray-600 font-medium truncate" title={organizationName}>
            GIT
          </p>
          <p className="text-xs text-gray-500 truncate">Support Technique</p>
        </div>
        
        <div className="relative group">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center px-2 py-2 h-12 text-gray-700 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all duration-200 text-xs"
          >
            <div className="w-4 h-4 flex items-center justify-center flex-shrink-0 transition-all duration-200">
              <LogOut className="!w-4 !h-4" />
            </div>
            <span className={`font-medium transition-all duration-300 ${
              isExpanded ? 'opacity-100 w-auto ml-3 h-auto' : 'opacity-0 w-0 h-0 overflow-hidden'
            }`}>
              Déconnexion
            </span>
          </button>
          
          {/* Tooltip pour déconnexion en mode réduit */}
          {!isExpanded && (
            <div className="absolute left-full top-1/2 transform -translate-y-1/2 ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
              Déconnexion
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;