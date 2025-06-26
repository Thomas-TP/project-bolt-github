import React, { useState, useEffect } from 'react';
import { Mail, Send, TestTube, Save, AlertCircle, CheckCircle, RefreshCw, ExternalLink, Copy, Info, Lock, Shield } from 'lucide-react';
import { useUser } from '../../hooks/useUser';
import { supabase } from '../../utils/supabase';
import { emailJSService, EmailJSConfig } from '../../services/emailJSService';
import { securityService } from '../../services/securityService';

const EmailJSConfigPage: React.FC = () => {
  const { user } = useUser();
  const [config, setConfig] = useState<EmailJSConfig>({
    serviceId: '',
    templateId: '',
    userId: '',
    enabled: false,
    invitationTemplateId: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const [showGuide, setShowGuide] = useState(false);
  const [securityEmail, setSecurityEmail] = useState('');
  const [testingSecurityEmail, setTestingSecurityEmail] = useState(false);

  useEffect(() => {
    if (user?.role === 'admin') {
      loadEmailJSConfig();
      loadSecurityEmail();
    }
  }, [user]);

  const loadEmailJSConfig = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', [
          'emailjs_service_id',
          'emailjs_template_id',
          'emailjs_user_id',
          'emailjs_enabled',
          'emailjs_invitation_template_id',
          'security_notification_email'
        ]);

      if (error) {
        console.error('Erreur Supabase:', error);
        throw error;
      }

      if (data) {
        const settingsMap = data.reduce((acc, setting) => {
          try {
            // Try to parse JSON if it's a JSON string
            if (typeof setting.value === 'string') {
              try {
                acc[setting.key] = JSON.parse(setting.value);
              } catch (e) {
                // If not JSON, use as is
                acc[setting.key] = setting.value;
              }
            } else {
              acc[setting.key] = setting.value;
            }
          } catch (e) {
            // If parsing fails, use the raw value
            acc[setting.key] = setting.value;
          }
          return acc;
        }, {} as Record<string, any>);

        setConfig({
          serviceId: settingsMap.emailjs_service_id || '',
          templateId: settingsMap.emailjs_template_id || '',
          userId: settingsMap.emailjs_user_id || '',
          enabled: settingsMap.emailjs_enabled === true || settingsMap.emailjs_enabled === 'true',
          invitationTemplateId: settingsMap.emailjs_invitation_template_id || ''
        });

        // Set security email
        if (settingsMap.security_notification_email) {
          setSecurityEmail(settingsMap.security_notification_email);
        }
      }
    } catch (err: any) {
      console.error('Erreur lors du chargement de la config EmailJS:', err);
      setError(`Impossible de charger la configuration EmailJS: ${err.message || 'Erreur inconnue'}`);
    } finally {
      setLoading(false);
    }
  };

  const loadSecurityEmail = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'security_notification_email')
        .maybeSingle(); // Utilise maybeSingle() au lieu de single()

      if (error) {
        console.error('Erreur lors du chargement de l\'email de sécurité:', error);
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        return;
      }

      if (data && data.value) {
        try {
          // Try to parse JSON if it's a JSON string
          if (typeof data.value === 'string' && (data.value.startsWith('"') || data.value.startsWith('{'))) {
            setSecurityEmail(JSON.parse(data.value));
          } else {
            setSecurityEmail(data.value);
          }
        } catch (e) {
          // If not JSON, use as is
          setSecurityEmail(data.value);
        }
      }
    } catch (err) {
      console.error('Erreur lors du chargement de l\'email de sécurité:', err);
    }
  };

  const saveEmailJSConfig = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      if (!user?.id) {
        throw new Error('Utilisateur non connecté');
      }

      const settings = [
        { key: 'emailjs_service_id', value: config.serviceId },
        { key: 'emailjs_template_id', value: config.templateId },
        { key: 'emailjs_user_id', value: config.userId },
        { key: 'emailjs_enabled', value: config.enabled.toString() },
        { key: 'emailjs_invitation_template_id', value: config.invitationTemplateId },
        { key: 'security_notification_email', value: securityEmail }
      ];

      for (const setting of settings) {
        const { error } = await supabase
          .from('system_settings')
          .upsert({
            key: setting.key,
            value: setting.value,
            description: `Configuration EmailJS - ${setting.key}`,
            updated_by: user.id,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'key'
          });

        if (error) {
          console.error('Erreur lors de la sauvegarde:', error);
          throw error;
        }
      }

      setSuccess('Configuration EmailJS sauvegardée avec succès !');
      setTimeout(() => setSuccess(null), 3000);

    } catch (err: any) {
      console.error('Erreur lors de la sauvegarde:', err);
      setError(`Erreur lors de la sauvegarde de la configuration: ${err.message || 'Erreur inconnue'}`);
    } finally {
      setSaving(false);
    }
  };

  const testEmailJSSending = async () => {
    if (!testEmail.trim()) {
      setError('Veuillez saisir une adresse email de test');
      return;
    }

    if (!config.serviceId || !config.templateId || !config.userId) {
      setError('Veuillez configurer tous les paramètres EmailJS avant de tester');
      return;
    }

    try {
      setTesting(true);
      setError(null);
      setSuccess(null);

      // Paramètres de test complets avec to_email explicitement défini
      const templateParams = {
        to_email: testEmail,
        to_name: 'Utilisateur Test',
        ticket_id: 'TEST-001',
        ticket_title: 'Test de configuration EmailJS',
        ticket_description: 'Ceci est un test de la configuration EmailJS.',
        client_name: 'Utilisateur Test',
        agent_name: 'Support Test',
        reply_to: testEmail // Ajout du reply_to pour certains templates
      };

      console.log('Envoi test avec paramètres:', templateParams);
      
      const result = await emailJSService.sendEmail(
        config.serviceId,
        config.templateId,
        templateParams,
        config.userId
      );

      if (result.success) {
        setSuccess(`Email de test envoyé avec succès à ${testEmail} ! Vérifiez votre boîte de réception.`);
      } else {
        throw new Error(result.error || 'Échec du test d\'envoi');
      }

      setTimeout(() => setSuccess(null), 5000);

    } catch (err: any) {
      console.error('Erreur lors du test d\'envoi:', err);
      setError(`Erreur lors du test d'envoi: ${err.message || 'Erreur inconnue'}`);
    } finally {
      setTesting(false);
    }
  };

  const testSecurityEmail = async () => {
    if (!securityEmail.trim()) {
      setError('Veuillez configurer une adresse email de sécurité avant de tester');
      return;
    }

    try {
      setTestingSecurityEmail(true);
      setError(null);
      setSuccess(null);

      // Envoyer un email de test de sécurité
      const result = await securityService.sendSecurityNotification(
        '🧪 TEST - Alerte de sécurité',
        'Ceci est un test de notification de sécurité',
        {
          'Type de test': 'Email de sécurité',
          'Date': new Date().toLocaleString(),
          'Utilisateur': user?.email || 'Inconnu',
          'Note': 'Ce message est un test et ne représente pas une véritable alerte de sécurité'
        }
      );

      if (result) {
        setSuccess(`Email de test de sécurité envoyé avec succès à ${securityEmail} ! Vérifiez votre boîte de réception.`);
      } else {
        throw new Error('Échec de l\'envoi de l\'email de sécurité');
      }

      setTimeout(() => setSuccess(null), 5000);

    } catch (err: any) {
      console.error('Erreur lors du test d\'envoi de sécurité:', err);
      setError(`Erreur lors du test d'envoi: ${err.message || 'Erreur inconnue'}`);
    } finally {
      setTestingSecurityEmail(false);
    }
  };

  const copyTemplateExample = () => {
    const template = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Notification de Ticket</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; border-radius: 10px; padding: 20px; border: 1px solid #dee2e6;">
    <div style="text-align: center; margin-bottom: 20px;">
      <h1 style="color: #dc3545; margin: 0;">HelpDesk GIT</h1>
      <p style="color: #6c757d; margin: 5px 0 0;">Geneva Institute of Technology</p>
    </div>
    
    <p>Bonjour {{to_name}},</p>
    
    <p>Un nouveau ticket a été créé dans notre système de support :</p>
    
    <div style="background-color: #fff; border-radius: 5px; padding: 15px; margin: 15px 0; border-left: 4px solid #dc3545;">
      <p><strong>Ticket ID:</strong> {{ticket_id}}</p>
      <p><strong>Titre:</strong> {{ticket_title}}</p>
      <p><strong>Description:</strong> {{ticket_description}}</p>
      <p><strong>Client:</strong> {{client_name}}</p>
      <p><strong>Agent assigné:</strong> {{agent_name}}</p>
    </div>
    
    <p>Vous pouvez suivre l\'évolution de ce ticket en vous connectant à votre espace client.</p>
    
    <p>Cordialement,<br>
    L\'équipe Support</p>
    
    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 12px; color: #6c757d;">
      <p>Ceci est un email automatique, merci de ne pas y répondre directement.</p>
    </div>
  </div>
</body>
</html>`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(template).then(() => {
        setSuccess('Template HTML copié dans le presse-papiers !');
        setTimeout(() => setSuccess(null), 2000);
      }).catch(() => {
        setError('Impossible de copier le template');
      });
    } else {
      setError('Fonction de copie non disponible dans ce navigateur');
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <Lock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Accès restreint</h3>
        <p className="text-gray-500">Seuls les administrateurs peuvent configurer les emails.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de la configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Configuration EmailJS</h1>
          <p className="text-gray-600 mt-2">Solution d'email simple sans serveur ni domaine vérifié</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowGuide(!showGuide)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Guide Setup</span>
          </button>
          
          <button
            onClick={loadEmailJSConfig}
            disabled={loading}
            className="bg-gray-600 hover:bg-gray-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualiser</span>
          </button>
        </div>
      </div>

      {/* Messages de statut */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <span className="text-green-700">{success}</span>
        </div>
      )}

      {/* Guide de configuration */}
      {showGuide && (
        <div className="bg-blue-50 rounded-xl shadow-sm border border-blue-200 p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">📧 Guide de Configuration EmailJS</h3>
          
          <div className="space-y-4 text-sm text-blue-800">
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <h4 className="font-semibold mb-2">1. Créer un compte EmailJS</h4>
              <p>Allez sur <a href="https://www.emailjs.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">emailjs.com</a> et créez un compte gratuit (200 emails/mois)</p>
            </div>

            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <h4 className="font-semibold mb-2">2. Configurer un service email</h4>
              <p>Dans EmailJS Dashboard → Email Services → Add New Service</p>
              <p>Choisissez Gmail, Outlook, ou tout autre fournisseur email</p>
              <p className="text-red-600 font-medium mt-2">⚠️ Suivez les instructions pour connecter votre compte email</p>
            </div>

            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <h4 className="font-semibold mb-2">3. Créer un template</h4>
              <p>Email Templates → Create New Template</p>
              <p>Utilisez les variables suivantes dans votre template :</p>
              <div className="bg-gray-100 p-3 rounded mt-2 font-mono text-xs">
                to_name, to_email, ticket_id, ticket_title, ticket_description, client_name, agent_name
              </div>
              <button
                onClick={copyTemplateExample}
                className="mt-2 bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 flex items-center space-x-1"
              >
                <Copy className="w-3 h-3" />
                <span>Copier template exemple</span>
              </button>
            </div>

            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <h4 className="font-semibold mb-2">4. Récupérer les IDs</h4>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Service ID :</strong> Dans Email Services (format: service_xxxxxxx)</li>
                <li><strong>Template ID :</strong> Dans Email Templates (format: template_xxxxxxx)</li>
                <li><strong>User ID :</strong> Dans Account → API Keys (format: user_xxxxxxxxxxxx)</li>
              </ul>
            </div>

            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <h4 className="font-semibold mb-2">5. Configuration du template</h4>
              <p className="text-red-600 font-medium">⚠️ IMPORTANT : Assurez-vous que votre template contient bien le champ "to_email" dans les paramètres</p>
              <p>Dans votre template EmailJS, ajoutez un champ "To Email" et utilisez la variable {'{{'}to_email{'}}'}</p>
              <p>Exemple de configuration :</p>
              <div className="bg-gray-100 p-3 rounded mt-2 font-mono text-xs">
                To Name: {'{{'}to_name{'}}'}
                <br/>
                To Email: {'{{'}to_email{'}}'}
                <br/>
                Reply To: {'{{'}reply_to{'}}'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Statut global */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              config.enabled ? 'bg-green-100' : 'bg-gray-100'
            }`}>
              <Mail className={`w-6 h-6 ${config.enabled ? 'text-green-600' : 'text-gray-400'}`} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                EmailJS {config.enabled ? 'Activé' : 'Désactivé'}
              </h3>
              <p className="text-gray-600">
                {config.enabled 
                  ? 'Service d\'email simple sans domaine vérifié'
                  : 'Les emails automatiques sont désactivés'
                }
              </p>
            </div>
          </div>
          
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => setConfig(prev => ({ ...prev, enabled: e.target.checked }))}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
          </label>
        </div>
      </div>

      {/* Configuration EmailJS */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl shadow-sm border border-purple-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center space-x-2">
          <Mail className="w-5 h-5" />
          <span>Configuration EmailJS</span>
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Service ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={config.serviceId}
              onChange={(e) => setConfig(prev => ({ ...prev, serviceId: e.target.value }))}
              placeholder="service_xxxxxxx"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
            <p className="text-sm text-gray-500 mt-1">
              ID du service email dans EmailJS Dashboard
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Template ID (Tickets) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={config.templateId}
              onChange={(e) => setConfig(prev => ({ ...prev, templateId: e.target.value }))}
              placeholder="template_xxxxxxx"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
            <p className="text-sm text-gray-500 mt-1">
              ID du template utilisé pour les notifications de tickets
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              User ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={config.userId}
              onChange={(e) => setConfig(prev => ({ ...prev, userId: e.target.value }))}
              placeholder="user_xxxxxxx"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
            <p className="text-sm text-gray-500 mt-1">
              ID de votre compte EmailJS (API Key)
            </p>
          </div>

          {/* Field for Invitation Template ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Template ID (Invitations)
            </label>
            <input
              type="text"
              value={config.invitationTemplateId}
              onChange={(e) => setConfig(prev => ({ ...prev, invitationTemplateId: e.target.value }))}
              placeholder="template_xxxxxxx"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
            <p className="text-sm text-gray-500 mt-1">
              ID du template utilisé pour les invitations d'utilisateurs
            </p>
          </div>

          {/* Field for Security Notification Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email de notification de sécurité <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={securityEmail}
              onChange={(e) => setSecurityEmail(e.target.value)}
              placeholder="admin@example.com"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
            <p className="text-sm text-gray-500 mt-1">
              Adresse email qui recevra les alertes de sécurité (virus détectés)
            </p>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            onClick={saveEmailJSConfig}
            disabled={saving || !config.serviceId || !config.templateId || !config.userId}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors"
          >
            {saving && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
            <Save className="w-5 h-5" />
            <span>Sauvegarder la Configuration</span>
          </button>
        </div>
      </div>

      {/* Test d'envoi d'email */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center space-x-2">
          <TestTube className="w-5 h-5" />
          <span>Tester l'envoi d'email</span>
        </h3>
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="Entrez une adresse email pour le test"
            className="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            onClick={testEmailJSSending}
            disabled={testing || !testEmail.trim() || !config.enabled}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors"
          >
            {testing && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
            <Send className="w-5 h-5" />
            <span>Envoyer un email de test</span>
          </button>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Assurez-vous que votre configuration EmailJS est correcte avant de tester.
        </p>
      </div>

      {/* Test d'envoi d'email de sécurité */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center space-x-2">
          <Shield className="w-5 h-5 text-red-600" />
          <span>Tester l'email de notification de sécurité</span>
        </h3>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 bg-gray-100 rounded-lg px-4 py-3 text-gray-700">
            {securityEmail || 'Aucune adresse email configurée'}
          </div>
          <button
            onClick={testSecurityEmail}
            disabled={testingSecurityEmail || !securityEmail.trim() || !config.enabled}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors"
          >
            {testingSecurityEmail && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
            <Shield className="w-5 h-5" />
            <span>Tester l'alerte de sécurité</span>
          </button>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Envoie un email de test à l'adresse de notification de sécurité configurée ci-dessus.
        </p>
      </div>

      {/* Informations sur les notifications de sécurité */}
      <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl shadow-sm border border-red-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center space-x-2">
          <Shield className="w-5 h-5 text-red-600" />
          <span>Notifications de Sécurité</span>
        </h3>
        <div className="mb-4">
          <p className="text-sm text-gray-700 mb-4">
            Les notifications de sécurité sont envoyées automatiquement à l'adresse email configurée ci-dessus lorsqu'un virus ou un fichier malveillant est détecté.
            Ces notifications sont envoyées directement sans utiliser de template EmailJS.
          </p>
          <div className="flex items-center space-x-2 mb-4">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-sm text-red-600 font-medium">
              L'email sera envoyé à : {securityEmail || 'Non configuré'}
            </span>
          </div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
          <div className="flex items-start space-x-2">
            <Info className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-yellow-700">
                <strong>Important :</strong> Assurez-vous de configurer une adresse email valide pour recevoir les alertes de sécurité.
                Ces notifications sont essentielles pour être informé des tentatives d'upload de fichiers malveillants.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailJSConfigPage;