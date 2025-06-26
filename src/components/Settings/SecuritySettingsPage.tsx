import React, { useState, useEffect } from 'react';
import { Shield, Save, AlertCircle, CheckCircle, RefreshCw, Database, FileText, Lock, Eye, EyeOff, Download } from 'lucide-react';
import { useUser } from '../../hooks/useUser';
import { supabase } from '../../utils/supabase';
import { maliceScanner } from '../../utils/maliceScanner';
// ...existing code...


const SecuritySettingsPage: React.FC = () => {
  // Hooks d'état
  const { user } = useUser();
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [scanHistory, setScanHistory] = useState<any[]>([]);
  const [loadingScanHistory, setLoadingScanHistory] = useState(false);
  const [showScanHistory, setShowScanHistory] = useState(false);
  const [testFileContent, setTestFileContent] = useState('');

  // Variables dépendantes des hooks
  const loginMethods = Array.isArray(settings.login_methods) ? settings.login_methods : ['microsoft'];
  const updateLoginMethods = (method: string, checked: boolean) => {
    let newMethods = Array.isArray(loginMethods) ? [...loginMethods] : [];
    if (checked) {
      if (!newMethods.includes(method)) newMethods.push(method);
    } else {
      // Empêche de tout décocher : au moins une méthode doit rester
      if (newMethods.length === 1 && newMethods[0] === method) {
        return;
      }
      newMethods = newMethods.filter((m) => m !== method);
    }
    updateSetting('login_methods', newMethods);
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      loadSettings();
    }
  }, [user]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', [
          'malware_scan_enabled',
          'block_malicious_files',
          'scan_file_types',
          'session_timeout',
          'require_2fa',
          'audit_logging',
          'password_min_length'
        ]);

      if (error) throw error;

      if (data) {
        const settingsMap = data.reduce((acc, setting) => {
          try {
            // Parse JSON values
            if (typeof setting.value === 'string' && (setting.value.startsWith('[') || setting.value.startsWith('{'))) {
              acc[setting.key] = JSON.parse(setting.value);
            } else if (setting.value === 'true' || setting.value === 'false') {
              acc[setting.key] = setting.value === 'true';
            } else {
              acc[setting.key] = setting.value;
            }
          } catch (e) {
            // If parsing fails, use the raw value
            acc[setting.key] = setting.value;
          }
          return acc;
        }, {} as Record<string, any>);

        setSettings(settingsMap);
      }
    } catch (err) {
      console.error('Erreur lors du chargement des paramètres:', err);
      setError('Impossible de charger les paramètres');
    } finally {
      setLoading(false);
    }
  };

  const loadScanHistory = async () => {
    try {
      setLoadingScanHistory(true);
      
      // Check if the malware_scans table exists
      const { error: tableCheckError } = await supabase
        .from('malware_scans')
        .select('id')
        .limit(1);
      
      if (tableCheckError) {
        console.log('Table malware_scans not available');
        setScanHistory([]);
        return;
      }
      
      // Get scan history
      const { data, error } = await supabase
        .from('malware_scans')
        .select(`
          *,
          user:users!malware_scans_scanned_by_fkey(full_name, email)
        `)
        .order('scanned_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      setScanHistory(data || []);
    } catch (err) {
      console.error('Erreur lors du chargement de l\'historique des scans:', err);
    } finally {
      setLoadingScanHistory(false);
    }
  };

  const updateSetting = async (key: string, value: any) => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      // Prepare the value for storage
      let storedValue = value;
      if (typeof value === 'boolean') {
        storedValue = value.toString();
      } else if (typeof value === 'object') {
        storedValue = JSON.stringify(value);
      }

      const { error } = await supabase
        .from('system_settings')
        .upsert({
          key,
          value: storedValue,
          description: getSettingDescription(key),
          updated_by: user?.id,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'key'
        });

      if (error) throw error;

      setSettings(prev => ({ ...prev, [key]: value }));
      setSuccess(`Paramètre "${key}" mis à jour avec succès`);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Erreur lors de la mise à jour:', err);
      setError('Erreur lors de la mise à jour du paramètre');
    } finally {
      setSaving(false);
    }
  };

  const getSettingDescription = (key: string): string => {
    const descriptions: Record<string, string> = {
      malware_scan_enabled: 'Activer l\'analyse antivirus des fichiers téléchargés',
      block_malicious_files: 'Bloquer automatiquement les fichiers détectés comme malveillants',
      scan_file_types: 'Types de fichiers à analyser pour les malwares',
      session_timeout: 'Durée de session en minutes',
      require_2fa: 'Exiger l\'authentification à deux facteurs',
      audit_logging: 'Enregistrer toutes les actions des utilisateurs',
      password_min_length: 'Longueur minimale du mot de passe'
    };
    return descriptions[key] || 'Paramètre système';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const generateEicarTestFile = () => {
    // EICAR test file content
    const eicarContent = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
    setTestFileContent(eicarContent);
    
    // Create a blob and download it
    const blob = new Blob([eicarContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'eicar.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setSuccess('Fichier de test EICAR généré. Utilisez-le pour tester la détection antivirus.');
    setTimeout(() => setSuccess(null), 5000);
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Accès restreint</h3>
        <p className="text-gray-500">Seuls les administrateurs peuvent accéder aux paramètres de sécurité.</p>
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Paramètres de Sécurité</h1>
          <p className="text-gray-600 mt-2">Configuration des options de sécurité et protection antivirus</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={loadSettings}
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
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <span className="text-green-700">{success}</span>
        </div>
      )}

      {/* Paramètres de sécurité antivirus */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center space-x-2">
          <Shield className="w-6 h-6 text-blue-600" />
          <span>Protection Antivirus</span>
        </h2>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <label htmlFor="malware_scan_enabled" className="block text-sm font-medium text-gray-700">
                Analyse antivirus des fichiers
              </label>
              <p className="text-sm text-gray-500 mt-1">
                Analyse automatiquement tous les fichiers téléchargés pour détecter les malwares
              </p>
            </div>
            <div className="relative inline-block w-12 h-6 transition duration-200 ease-in-out">
              <input
                type="checkbox"
                id="malware_scan_enabled"
                checked={settings.malware_scan_enabled === true}
                onChange={(e) => updateSetting('malware_scan_enabled', e.target.checked)}
                className="opacity-0 w-0 h-0"
              />
              <label
                htmlFor="malware_scan_enabled"
                className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-colors duration-200 ${
                  settings.malware_scan_enabled === true ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute left-1 bottom-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 ${
                    settings.malware_scan_enabled === true ? 'transform translate-x-6' : ''
                  }`}
                ></span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label htmlFor="block_malicious_files" className="block text-sm font-medium text-gray-700">
                Bloquer les fichiers malveillants
              </label>
              <p className="text-sm text-gray-500 mt-1">
                Empêche automatiquement le téléchargement de fichiers détectés comme malveillants
              </p>
            </div>
            <div className="relative inline-block w-12 h-6 transition duration-200 ease-in-out">
              <input
                type="checkbox"
                id="block_malicious_files"
                checked={settings.block_malicious_files === true}
                onChange={(e) => updateSetting('block_malicious_files', e.target.checked)}
                className="opacity-0 w-0 h-0"
              />
              <label
                htmlFor="block_malicious_files"
                className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-colors duration-200 ${
                  settings.block_malicious_files === true ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute left-1 bottom-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 ${
                    settings.block_malicious_files === true ? 'transform translate-x-6' : ''
                  }`}
                ></span>
              </label>
            </div>
          </div>

          {/* Test EICAR section */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h3 className="text-md font-medium text-blue-800 mb-2 flex items-center space-x-2">
              <FileText className="w-5 h-5" />
              <span>Test de détection antivirus</span>
            </h3>
            <p className="text-sm text-blue-700 mb-3">
              Générez un fichier EICAR standard pour tester la détection antivirus. Ce fichier est reconnu par tous les antivirus comme un virus de test inoffensif.
            </p>
            <button
              onClick={generateEicarTestFile}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors mx-auto"
            >
              <Download className="w-4 h-4" />
              <span>Générer fichier test EICAR</span>
            </button>
            {testFileContent && (
              <div className="mt-3 p-3 bg-gray-100 rounded-lg text-xs font-mono overflow-x-auto">
                {testFileContent}
              </div>
            )}
          </div>

          <div>
            <button
              onClick={() => {
                setShowScanHistory(!showScanHistory);
                if (!showScanHistory) {
                  loadScanHistory();
                }
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              {showScanHistory ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span>{showScanHistory ? 'Masquer l\'historique des scans' : 'Afficher l\'historique des scans'}</span>
            </button>
          </div>

          {showScanHistory && (
            <div className="mt-4">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Historique des analyses antivirus</h3>
              
              {loadingScanHistory ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : scanHistory.length === 0 ? (
                <div className="bg-gray-50 rounded-lg p-6 text-center">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">Aucun historique d'analyse disponible</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fichier</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Taille</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Résultat</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utilisateur</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {scanHistory.map((scan) => (
                        <tr key={scan.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(scan.scanned_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{scan.file_name}</div>
                            <div className="text-sm text-gray-500">{scan.file_type}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {(scan.file_size / 1024).toFixed(2)} KB
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              scan.is_clean 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {scan.is_clean ? 'Sécurisé' : 'Menace détectée'}
                            </span>
                            {!scan.is_clean && scan.threats && (
                              <div className="text-xs text-red-600 mt-1">
                                {scan.threats.join(', ')}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {scan.user?.full_name || scan.user?.email || 'Utilisateur inconnu'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Paramètres d'authentification */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center space-x-2">
          <Lock className="w-6 h-6 text-purple-600" />
          <span>Authentification et Accès</span>
        </h2>

        <div className="space-y-6">
          <div>
            <label htmlFor="session_timeout" className="block text-sm font-medium text-gray-700 mb-2">
              Délai d'expiration de session (minutes)
            </label>
            <input
              type="number"
              id="session_timeout"
              value={settings.session_timeout || 480}
              onChange={(e) => updateSetting('session_timeout', parseInt(e.target.value))}
              min="15"
              max="1440"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-sm text-gray-500 mt-1">
              Durée après laquelle les utilisateurs sont automatiquement déconnectés pour inactivité
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label htmlFor="require_2fa" className="block text-sm font-medium text-gray-700">
                Authentification à deux facteurs (2FA)
              </label>
              <p className="text-sm text-gray-500 mt-1">
                Exige que les utilisateurs configurent et utilisent la 2FA pour se connecter
              </p>
            </div>
            <div className="relative inline-block w-12 h-6 transition duration-200 ease-in-out">
              <input
                type="checkbox"
                id="require_2fa"
                checked={settings.require_2fa === true}
                onChange={(e) => updateSetting('require_2fa', e.target.checked)}
                className="opacity-0 w-0 h-0"
              />
              <label
                htmlFor="require_2fa"
                className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-colors duration-200 ${
                  settings.require_2fa === true ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute left-1 bottom-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 ${
                    settings.require_2fa === true ? 'transform translate-x-6' : ''
                  }`}
                ></span>
              </label>
            </div>
          </div>

          <div>
            <label htmlFor="password_min_length" className="block text-sm font-medium text-gray-700 mb-2">
              Longueur minimale du mot de passe
            </label>
            <input
              type="number"
              id="password_min_length"
              value={settings.password_min_length || 8}
              onChange={(e) => updateSetting('password_min_length', parseInt(e.target.value))}
              min="6"
              max="32"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-sm text-gray-500 mt-1">
              Nombre minimum de caractères requis pour les mots de passe
            </p>
          </div>
        </div>
      </div>

      {/* Paramètres d'authentification */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center space-x-2">
          <Lock className="w-6 h-6 text-blue-600" />
          <span>Méthodes d'authentification</span>
        </h2>
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <input
              type="checkbox"
              id="login_microsoft"
              checked={loginMethods.includes('microsoft')}
              onChange={e => updateLoginMethods('microsoft', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="login_microsoft" className="block text-sm font-medium text-gray-700">Microsoft (Azure AD)</label>
          </div>
          <div className="flex items-center space-x-4">
            <input
              type="checkbox"
              id="login_email"
              checked={loginMethods.includes('email')}
              onChange={e => updateLoginMethods('email', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="login_email" className="block text-sm font-medium text-gray-700">Email / Mot de passe</label>
          </div>
        </div>
        <div className="mt-4 bg-yellow-50 rounded-lg p-4 border border-yellow-200">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800">⚠️ Configuration Supabase requise</h3>
              <p className="text-sm text-yellow-700 mt-1">
                Pour que les méthodes sélectionnées fonctionnent, configurez les providers correspondants dans Supabase Auth (Dashboard → Authentication → Providers).
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center space-x-2">
          <Database className="w-6 h-6 text-green-600" />
          <span>Journalisation et Audit</span>
        </h2>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <label htmlFor="audit_logging" className="block text-sm font-medium text-gray-700">
                Journalisation d'audit
              </label>
              <p className="text-sm text-gray-500 mt-1">
                Enregistre toutes les actions des utilisateurs pour l'audit et la conformité
              </p>
            </div>
            <div className="relative inline-block w-12 h-6 transition duration-200 ease-in-out">
              <input
                type="checkbox"
                id="audit_logging"
                checked={settings.audit_logging === true}
                onChange={(e) => updateSetting('audit_logging', e.target.checked)}
                className="opacity-0 w-0 h-0"
              />
              <label
                htmlFor="audit_logging"
                className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-colors duration-200 ${
                  settings.audit_logging === true ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute left-1 bottom-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 ${
                    settings.audit_logging === true ? 'transform translate-x-6' : ''
                  }`}
                ></span>
              </label>
            </div>
          </div>

          <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-yellow-800">Informations de sécurité</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  La protection antivirus est active pour tous les fichiers téléchargés. Les fichiers sont analysés avant d'être stockés dans le système.
                </p>
                <p className="text-sm text-yellow-700 mt-1">
                  Les fichiers détectés comme malveillants sont automatiquement bloqués et ne peuvent pas être téléchargés.
                </p>
                <p className="text-sm text-yellow-700 mt-1">
                  Le système détecte également le fichier de test EICAR standard utilisé pour vérifier les antivirus.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecuritySettingsPage;