import React, { useState, useEffect } from 'react';
import { Settings, Bell, Shield, Users, Database, Mail, Palette, CheckCircle, AlertCircle, RefreshCw, Zap } from 'lucide-react';
import { useUser } from '../../hooks/useUser';
import { supabase } from '../../utils/supabase';
import { useParams, useNavigate } from 'react-router-dom';
import EmailJSConfigPage from './EmailJSConfigPage';
import SecuritySettingsPage from './SecuritySettingsPage';
import UserNotificationSettings from './UserNotificationSettings';
import AutomationsPage from './Automations/AutomationsPage';

const defaultSettings = {
  auto_assign_tickets: 'false',
  knowledge_base_public: 'true',
  max_ticket_response_time: '24',
  notifications_enabled: 'true',
  satisfaction_survey_enabled: 'true',
  email_notifications: 'true',
  default_user_role: 'client',
  auto_registration: 'true',
  require_email_verification: 'false',
  session_timeout: '480',
  require_2fa: 'false',
  audit_logging: 'true',
  password_min_length: '8',
  primary_color: '#ef4444',
  secondary_color: '#f59e0b',
  organization_name: 'Geneva Institute of Technology',
  logo_url: 'https://i.postimg.cc/TPXN8mX3/Whats-App-Image-2025-06-12-18-31-34-d5a1cf22-removebg-preview.png'
};

interface SettingsPageProps {
  initialActiveTab?: string;
}

type SettingsKey = keyof typeof defaultSettings;

const SettingsPage: React.FC<SettingsPageProps> = ({ initialActiveTab }) => {
  const { user } = useUser();
  const { tab } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(tab || initialActiveTab || 'general');
  // const [error, setError] = useState<string | null>(null);
  // const [success, setSuccess] = useState<string | null>(null);
  const [localSettings, setLocalSettings] = useState({ ...defaultSettings });

  useEffect(() => {
    if (tab && tab !== activeTab) setActiveTab(tab);
    if (!tab && initialActiveTab && initialActiveTab !== activeTab) setActiveTab(initialActiveTab);
  }, [tab, initialActiveTab]);

  useEffect(() => {
    // Simuler chargement des settings (remplacer par fetch réel si besoin)
    setTimeout(() => setLoading(false), 300);
  }, []);

  const getSetting = (key: SettingsKey): string => localSettings[key] ?? defaultSettings[key] ?? '';
  const updateSetting = (key: SettingsKey, value: string) => setLocalSettings((prev) => ({ ...prev, [key]: value }));

  const tabs = [
    { id: 'general', label: 'Général', icon: Settings },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'users', label: 'Utilisateurs', icon: Users },
    { id: 'security', label: 'Sécurité', icon: Shield },
    { id: 'automations', label: 'Automatisations', icon: Zap },
    { id: 'appearance', label: 'Apparence', icon: Palette },
    { id: 'emailjs', label: 'Configuration Email', icon: Mail }
  ];

  if (!user || user.role !== 'admin') {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Accès restreint</h3>
        <p className="text-gray-500">Seuls les administrateurs peuvent accéder aux paramètres système.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des paramètres...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Paramètres Système</h1>
          <p className="text-gray-600 mt-2">Configuration de la plateforme {getSetting('organization_name')}</p>
        </div>
      </div>
      {/* Messages d'erreur/succès désactivés car variables non définies */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6 overflow-x-auto">
            {tabs.map((tabItem) => (
              <button
                key={tabItem.id}
                onClick={() => {
                  setActiveTab(tabItem.id);
                  navigate(`/settings/${tabItem.id}`);
                }}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${activeTab === tabItem.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              >
                <tabItem.icon className="w-4 h-4" />
                <span>{tabItem.label}</span>
              </button>
            ))}
          </nav>
        </div>
        <div className="p-6">
          {activeTab === 'general' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Paramètres Généraux</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label htmlFor="auto_assign_tickets" className="block text-sm font-medium text-gray-700">Assignation automatique des tickets</label>
                  <input type="checkbox" id="auto_assign_tickets" checked={getSetting('auto_assign_tickets') === 'true'} onChange={e => updateSetting('auto_assign_tickets', e.target.checked.toString())} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                </div>
                <div className="flex items-center justify-between">
                  <label htmlFor="knowledge_base_public" className="block text-sm font-medium text-gray-700">Base de connaissances publique</label>
                  <input type="checkbox" id="knowledge_base_public" checked={getSetting('knowledge_base_public') === 'true'} onChange={e => updateSetting('knowledge_base_public', e.target.checked.toString())} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                </div>
                <div className="flex items-center justify-between">
                  <label htmlFor="max_ticket_response_time" className="block text-sm font-medium text-gray-700">Temps de réponse maximum (heures)</label>
                  <input type="number" id="max_ticket_response_time" value={getSetting('max_ticket_response_time')} onChange={e => updateSetting('max_ticket_response_time', e.target.value)} className="w-24 border border-gray-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
              </div>
            </div>
          )}
          {activeTab === 'notifications' && <UserNotificationSettings />}
          {activeTab === 'automations' && <AutomationsPage />}
          {activeTab === 'users' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Utilisateurs</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label htmlFor="default_user_role" className="block text-sm font-medium text-gray-700">Rôle par défaut</label>
                  <select id="default_user_role" value={getSetting('default_user_role')} onChange={e => updateSetting('default_user_role', e.target.value)} className="border border-gray-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="client">Client</option>
                    <option value="agent">Agent</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <label htmlFor="auto_registration" className="block text-sm font-medium text-gray-700">Inscription automatique</label>
                  <input type="checkbox" id="auto_registration" checked={getSetting('auto_registration') === 'true'} onChange={e => updateSetting('auto_registration', e.target.checked.toString())} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                </div>
                <div className="flex items-center justify-between">
                  <label htmlFor="require_email_verification" className="block text-sm font-medium text-gray-700">Vérification email obligatoire</label>
                  <input type="checkbox" id="require_email_verification" checked={getSetting('require_email_verification') === 'true'} onChange={e => updateSetting('require_email_verification', e.target.checked.toString())} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                </div>
              </div>
            </div>
          )}
          {activeTab === 'security' && <SecuritySettingsPage />}
          {activeTab === 'appearance' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Apparence</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label htmlFor="primary_color" className="block text-sm font-medium text-gray-700">Couleur principale</label>
                  <input type="color" id="primary_color" value={getSetting('primary_color')} onChange={e => updateSetting('primary_color', e.target.value)} className="w-10 h-10 border-0" />
                </div>
                <div className="flex items-center justify-between">
                  <label htmlFor="secondary_color" className="block text-sm font-medium text-gray-700">Couleur secondaire</label>
                  <input type="color" id="secondary_color" value={getSetting('secondary_color')} onChange={e => updateSetting('secondary_color', e.target.value)} className="w-10 h-10 border-0" />
                </div>
                <div className="flex items-center justify-between">
                  <label htmlFor="organization_name" className="block text-sm font-medium text-gray-700">Nom de l'organisation</label>
                  <input type="text" id="organization_name" value={getSetting('organization_name')} onChange={e => updateSetting('organization_name', e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div className="flex items-center justify-between">
                  <label htmlFor="logo_url" className="block text-sm font-medium text-gray-700">URL du logo</label>
                  <input type="text" id="logo_url" value={getSetting('logo_url')} onChange={e => updateSetting('logo_url', e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
              </div>
            </div>
          )}
          {activeTab === 'emailjs' && <EmailJSConfigPage />}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;