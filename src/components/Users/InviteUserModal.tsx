import React, { useState, useEffect } from 'react';
import { X, Mail, Copy, Check, AlertCircle } from 'lucide-react';
import { invitationService } from '../../services/invitationService';
import { emailJSService, EmailJSConfig } from '../../services/emailJSService';

interface InviteUserModalProps {
  onClose: () => void;
}

const InviteUserModal: React.FC<InviteUserModalProps> = ({ onClose }) => {
  const [emails, setEmails] = useState<string>('');
  const [link, setLink] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [emailJSConfig, setEmailJSConfig] = useState<EmailJSConfig | null>(null);

  useEffect(() => {
    const fetchEmailJSConfig = async () => {
      const config = await emailJSService.getServiceConfig();
      setEmailJSConfig(config);
      if (!config || !config.enabled || !config.invitationTemplateId) {
        setError('Configuration EmailJS incomplète ou désactivée pour les invitations. Veuillez vérifier les paramètres.');
      }
    };
    fetchEmailJSConfig();
  }, []);

  const generateRandomToken = () => {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  };

  const handleGenerateLink = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const token = generateRandomToken();
      const generatedLink = `${window.location.origin}/invite?token=${token}`;
      setLink(generatedLink);
      setCopied(false);
      setSuccess('Lien généré avec succès !');
    } catch (err) {
      console.error('Erreur lors de la génération du lien:', err);
      setError('Erreur lors de la génération du lien.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendInvitations = async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (!emailJSConfig || !emailJSConfig.enabled || !emailJSConfig.invitationTemplateId) {
      setError('Configuration EmailJS incomplète ou désactivée pour les invitations. Impossible d\'envoyer les emails.');
      setLoading(false);
      return;
    }

    const emailList = emails.split(',').map(email => email.trim()).filter(email => email !== '');

    if (emailList.length === 0) {
      setError('Veuillez entrer au moins une adresse e-mail.');
      setLoading(false);
      return;
    }

    let allSuccess = true;
    const successfulEmails: string[] = [];
    const failedEmails: string[] = [];

    for (const email of emailList) {
      try {
        const token = generateRandomToken();
        const invitationLink = `${window.location.origin}/invite?token=${token}`;
        
        // Create invitation in Supabase
        await invitationService.createInvitation(email, token);

        // Send email via EmailJS
        await emailJSService.sendEmail(
          emailJSConfig.serviceId,
          emailJSConfig.invitationTemplateId,
          {
            to_email: email,
            invitation_link: invitationLink,
          },
          emailJSConfig.userId
        );
        successfulEmails.push(email);
      } catch (err) {
        console.error(`Erreur lors de l'envoi de l'invitation à ${email}:`, err);
        failedEmails.push(email);
        allSuccess = false;
      }
    }

    if (allSuccess) {
      setSuccess('Toutes les invitations ont été envoyées avec succès !');
      setEmails(''); // Clear emails on success
    } else if (successfulEmails.length > 0) {
      setSuccess(`Invitations envoyées à: ${successfulEmails.join(', ')}. Échec pour: ${failedEmails.join(', ')}.`);
    } else {
      setError('Échec de l\'envoi de toutes les invitations.');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Inviter un utilisateur</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-red-700">{error}</span>
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center space-x-2">
              <Check className="w-5 h-5 text-green-600" />
              <span className="text-green-700">{success}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Générer un lien d'invitation</label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  readOnly
                  value={link}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 text-gray-700"
                  placeholder="Cliquez sur 'Générer' pour obtenir un lien"
                />
                <button
                  onClick={handleGenerateLink}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Générer
                </button>
                <button
                  onClick={handleCopyLink}
                  disabled={!link}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors flex items-center space-x-2 disabled:opacity-50"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copié!' : 'Copier'}</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Envoyer des invitations par e-mail (séparer par des virgules)</label>
              <textarea
                value={emails}
                onChange={(e) => setEmails(e.target.value)}
                rows={4}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="email1@example.com, email2@example.com"
              ></textarea>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              disabled={loading}
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSendInvitations}
              disabled={loading || !emails || !emailJSConfig?.enabled || !emailJSConfig?.invitationTemplateId}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
            >
              {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
              <Mail className="w-4 h-4" />
              <span>Envoyer les invitations</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InviteUserModal;


