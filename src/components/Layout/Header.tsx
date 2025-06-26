import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, User, X, Check, Trash2, MessageSquare } from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import EditProfileModal from '../Users/EditProfileModal';
import { Database } from '../../lib/supabase-types';

interface HeaderProps {
  title: string;
  user?: Database['public']['Tables']['users']['Row'];
}

const Header: React.FC<HeaderProps> = ({ title, user }) => {
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification 
  } = useNotifications();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [organizationName, setOrganizationName] = useState('Geneva Institute of Technology');
  const [primaryColor, setPrimaryColor] = useState('#ef4444');
  const [secondaryColor, setSecondaryColor] = useState('#f59e0b');

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

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return 'ℹ️';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'À l\'instant';
    if (diffInMinutes < 60) return `Il y a ${diffInMinutes}min`;
    if (diffInMinutes < 1440) return `Il y a ${Math.floor(diffInMinutes / 60)}h`;
    return `Il y a ${Math.floor(diffInMinutes / 1440)}j`;
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 relative">
      <div className="flex items-center justify-between">
        <div className="flex flex-col items-start w-full">
          <div className="flex flex-col items-center w-full mb-2">
            <h1 className="text-2xl font-bold text-center">
              <span style={{ 
                background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                display: 'inline-block',
                color: primaryColor // Fallback color
              }}>
                {title}
              </span>
            </h1>
            <p className="text-sm text-gray-600 text-center">{organizationName}</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Rechercher..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 w-64"
              style={{ 
                borderColor: 'var(--color-primary)',
                outlineColor: 'var(--color-primary)'
              }}
            />
          </div>

          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-gray-400 hover:text-red-600 transition-colors"
              style={{ 
                color: showNotifications ? primaryColor : 'var(--tw-text-opacity)'
              }}
            >
              <Bell className="w-6 h-6" />
              {unreadCount > 0 && (
                <span 
                  className="absolute -top-1 -right-1 w-5 h-5 text-white text-xs rounded-full flex items-center justify-center font-medium"
                  style={{ backgroundColor: primaryColor }}
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Panel des notifications */}
            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-50 max-h-96 overflow-hidden">
                <div 
                  className="p-4 border-b border-gray-200 flex items-center justify-between"
                  style={{ 
                    background: `linear-gradient(135deg, ${primaryColor}15, ${secondaryColor}15)`
                  }}
                >
                  <h3 className="font-semibold text-gray-900">Notifications</h3>
                  <div className="flex items-center space-x-2">
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-sm font-medium"
                        style={{ color: primaryColor }}
                      >
                        Tout marquer comme lu
                      </button>
                    )}
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>Aucune notification</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {notifications.map((notification) => {
                        // Si la notification a une action_url vers un ticket, on la rend cliquable
                        const isTicketNotif = notification.action_url && notification.action_url.startsWith('/tickets/');
                        const handleNotifClick = async () => {
                          if (isTicketNotif && notification.action_url) {
                            await markAsRead(notification.id);
                            setShowNotifications(false);
                            navigate(notification.action_url);
                          }
                        };
                        return (
                          <div
                            key={notification.id}
                            className={`p-4 hover:bg-gray-50 transition-colors ${
                              !notification.is_read ? 'border-l-4' : ''
                            } ${isTicketNotif ? 'cursor-pointer' : ''}`}
                            style={{ 
                              backgroundColor: !notification.is_read ? `${primaryColor}10` : '',
                              borderLeftColor: !notification.is_read ? primaryColor : ''
                            }}
                            onClick={isTicketNotif ? handleNotifClick : undefined}
                            title={isTicketNotif ? 'Voir le ticket' : ''}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  <span className="text-lg">
                                    {getNotificationIcon(notification.type)}
                                  </span>
                                  <h4 className="font-medium text-gray-900 text-sm">
                                    {notification.title}
                                  </h4>
                                </div>
                                <p className="text-gray-600 text-sm mb-2">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {formatTimeAgo(notification.created_at)}
                                </p>
                              </div>
                              <div className="flex items-center space-x-1 ml-2">
                                {!notification.is_read && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); markAsRead(notification.id); }}
                                    className="p-1 hover:text-red-800"
                                    style={{ color: primaryColor }}
                                    title="Marquer comme lu"
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  onClick={(e) => { e.stopPropagation(); deleteNotification(notification.id); }}
                                  className="p-1 hover:text-red-800"
                                  style={{ color: primaryColor }}
                                  title="Supprimer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {notifications.length > 0 && (
                  <div 
                    className="p-3 border-t border-gray-200 text-center"
                    style={{ 
                      background: `linear-gradient(135deg, ${primaryColor}15, ${secondaryColor}15)`
                    }}
                  >
                    <button 
                      className="text-sm font-medium"
                      style={{ color: primaryColor }}
                    >
                      Voir toutes les notifications
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-3 ml-4 pl-4 border-l border-gray-200">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center cursor-pointer hover:shadow-lg transition bg-white"
              style={{ 
                background: user?.avatar_url ? '#fff' : `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`
              }}
              onClick={() => setShowProfileModal(true)}
            >
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt={user.full_name || user.email} className="w-10 h-10 rounded-full object-cover" style={{ background: '#fff' }} />
              ) : (
                <User className="w-6 h-6 text-white" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{user?.full_name || user?.email || 'Utilisateur'}</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
          </div>
        </div>
      </div>

      {showProfileModal && user && (
        <EditProfileModal
          user={user}
          onClose={() => setShowProfileModal(false)}
          onProfileUpdated={() => window.location.reload()}
        />
      )}
    </header>
  );
};

export default Header;