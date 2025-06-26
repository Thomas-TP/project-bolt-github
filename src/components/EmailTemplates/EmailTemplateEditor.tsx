import React, { useState, useEffect } from 'react';
import { Save, AlertCircle, CheckCircle, X, Code, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { useUser } from '../../hooks/useUser';
import { supabase } from '../../utils/supabase';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  variables: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  updated_by?: string;
}

interface EmailTemplateEditorProps {
  templateId?: string;
  onClose: () => void;
  onSave: () => void;
}

const EmailTemplateEditor: React.FC<EmailTemplateEditorProps> = ({ 
  templateId, 
  onClose, 
  onSave 
}) => {
  const { user } = useUser();
  const [template, setTemplate] = useState<EmailTemplate>({
    id: '',
    name: '',
    subject: '',
    body: '',
    variables: [],
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<Record<string, string>>({});

  useEffect(() => {
    if (templateId) {
      loadTemplate(templateId);
    }
  }, [templateId]);

  const loadTemplate = async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        setTemplate({
          ...data,
          variables: Array.isArray(data.variables) ? data.variables : []
        });

        // Initialize preview data with empty values for each variable
        const previewValues = {};
        if (Array.isArray(data.variables)) {
          data.variables.forEach(variable => {
            previewValues[variable] = `[${variable}]`;
          });
        }
        setPreviewData(previewValues);
      }
    } catch (err) {
      console.error('Erreur lors du chargement du template:', err);
      setError('Impossible de charger le template');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!template.name || !template.subject || !template.body) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const templateData = {
        ...template,
        updated_at: new Date().toISOString(),
        updated_by: user?.id
      };

      let result;
      if (templateId) {
        // Update existing template
        const { data, error } = await supabase
          .from('email_templates')
          .update(templateData)
          .eq('id', templateId)
          .select()
          .single();

        if (error) throw error;
        result = data;
      } else {
        // Create new template
        const { data, error } = await supabase
          .from('email_templates')
          .insert(templateData)
          .select()
          .single();

        if (error) throw error;
        result = data;
      }

      setSuccess('Template sauvegardé avec succès');
      setTimeout(() => {
        onSave();
      }, 1500);
    } catch (err) {
      console.error('Erreur lors de la sauvegarde:', err);
      setError('Erreur lors de la sauvegarde du template');
    } finally {
      setSaving(false);
    }
  };

  const extractVariables = () => {
    const regex = /{([a-zA-Z0-9_]+)}/g;
    const subject = template.subject || '';
    const body = template.body || '';
    
    const subjectMatches = [...subject.matchAll(regex)].map(match => match[1]);
    const bodyMatches = [...body.matchAll(regex)].map(match => match[1]);
    
    const uniqueVariables = [...new Set([...subjectMatches, ...bodyMatches])];
    
    setTemplate(prev => ({
      ...prev,
      variables: uniqueVariables
    }));

    // Update preview data with new variables
    const newPreviewData = { ...previewData };
    uniqueVariables.forEach(variable => {
      if (!newPreviewData[variable]) {
        newPreviewData[variable] = `[${variable}]`;
      }
    });
    setPreviewData(newPreviewData);
  };

  const renderPreview = () => {
    let previewSubject = template.subject;
    let previewBody = template.body;

    // Replace variables with preview values
    Object.entries(previewData).forEach(([key, value]) => {
      const regex = new RegExp(`{${key}}`, 'g');
      previewSubject = previewSubject.replace(regex, value);
      previewBody = previewBody.replace(regex, value);
    });

    return (
      <div className="space-y-4">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <h3 className="font-medium text-gray-900 mb-2">Sujet:</h3>
          <p className="text-gray-800">{previewSubject}</p>
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <h3 className="font-medium text-gray-900 mb-2">Corps:</h3>
          <div 
            className="prose max-w-none text-gray-800"
            dangerouslySetInnerHTML={{ __html: previewBody }}
          />
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <h2 className="text-xl font-semibold text-gray-900">
            {templateId ? 'Modifier le Template Email' : 'Créer un Template Email'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Status messages */}
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

          <div className="flex space-x-4 mb-6">
            <button
              onClick={() => setShowPreview(false)}
              className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
                !showPreview 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Code className="w-4 h-4" />
              <span>Éditer</span>
            </button>
            <button
              onClick={() => {
                extractVariables();
                setShowPreview(true);
              }}
              className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
                showPreview 
                  ? 'bg-green-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Eye className="w-4 h-4" />
              <span>Aperçu</span>
            </button>
          </div>

          {!showPreview ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom du Template <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={template.name}
                    onChange={(e) => setTemplate(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="ex: new_ticket, ticket_assigned, etc."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Identifiant unique pour ce template (sans espaces ni caractères spéciaux)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Actif
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={template.is_active}
                      onChange={(e) => setTemplate(prev => ({ ...prev, is_active: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-gray-700">
                      {template.is_active ? 'Template actif' : 'Template inactif'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Désactivez pour empêcher l'envoi d'emails avec ce template
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sujet <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={template.subject}
                  onChange={(e) => setTemplate(prev => ({ ...prev, subject: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="ex: Votre ticket #{ticket_id} a été créé"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Corps du message <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={template.body}
                  onChange={(e) => setTemplate(prev => ({ ...prev, body: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                  rows={15}
                  placeholder="<h1>Titre</h1><p>Contenu du message</p>"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Utilisez du HTML pour la mise en forme. Les variables sont entourées d'accolades, ex: {'{client_name}'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Variables détectées
                </label>
                <div className="flex items-center space-x-2 mb-2">
                  <button
                    onClick={extractVariables}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200 transition-colors flex items-center space-x-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Détecter les variables</span>
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {template.variables.map((variable, index) => (
                    <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                      {'{' + variable + '}'}
                    </span>
                  ))}
                  {template.variables.length === 0 && (
                    <span className="text-gray-500 text-sm">
                      Aucune variable détectée. Utilisez {'{nom_variable}'} dans votre template.
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h3 className="font-medium text-blue-900 mb-3">Valeurs des variables pour l'aperçu</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {template.variables.map((variable, index) => (
                    <div key={index}>
                      <label className="block text-sm font-medium text-blue-700 mb-1">
                        {'{' + variable + '}'}
                      </label>
                      <input
                        type="text"
                        value={previewData[variable] || `[${variable}]`}
                        onChange={(e) => setPreviewData(prev => ({ ...prev, [variable]: e.target.value }))}
                        className="w-full border border-blue-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        placeholder={`Valeur pour ${variable}`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="font-medium text-gray-900 mb-4">Aperçu de l'email</h3>
                {renderPreview()}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-4 p-6 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !template.name || !template.subject || !template.body}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{saving ? 'Sauvegarde...' : 'Sauvegarder'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailTemplateEditor;