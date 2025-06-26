import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Microscope as Microsoft, Shield, Users, Zap, AlertCircle } from 'lucide-react';
import { authService } from '../../utils/supabase';
import { debugService } from '../../utils/debug';

const LoginPage: React.FC = () => {
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [organizationName, setOrganizationName] = useState('Geneva Institute of Technology');
  const [loginMethods, setLoginMethods] = useState<string[]>(['microsoft']);

  // Affiche un message d'attente si on est en retour OAuth
  const params = new URLSearchParams(location.search);
  const hasOAuthCode = !!params.get('code');

  useEffect(() => {
    if (hasOAuthCode) return;
    // Charger les paramètres d'apparence et d'auth
    const loadSettings = async () => {
      try {
        const { supabase } = await import('../../utils/supabase');
        const { data: settings } = await supabase
          .from('system_settings')
          .select('key, value')
          .in('key', ['organization_name', 'login_methods']);
        if (settings) {
          const settingsMap = settings.reduce((acc, setting) => {
            if (setting.key === 'login_methods') {
              try {
                acc.login_methods = JSON.parse(setting.value);
              } catch {
                acc.login_methods = ['microsoft'];
              }
            } else {
              acc[setting.key] = setting.value;
            }
            return acc;
          }, {} as Record<string, any>);
          if (settingsMap.organization_name) setOrganizationName(settingsMap.organization_name);
          if (Array.isArray(settingsMap.login_methods)) setLoginMethods(settingsMap.login_methods);
        }
      } catch {}
    };
    loadSettings();
  }, [hasOAuthCode]);

  const loadAppearanceSettings = async () => {
    try {
      // Importer dynamiquement Supabase pour éviter les erreurs de chargement
      const { supabase } = await import('../../utils/supabase');
      
      const { data: settings } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', ['organization_name']);

      if (settings) {
        const settingsMap = settings.reduce((acc, setting) => {
          acc[setting.key] = setting.value;
          return acc;
        }, {} as Record<string, string>);
        
        // Mettre à jour le nom de l'organisation
        if (settingsMap.organization_name) {
          setOrganizationName(settingsMap.organization_name);
        }
      }
    } catch (error) {
      console.log('Paramètres d\'apparence non disponibles:', error);
    }
  };

  const handleMicrosoftLogin = async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('🚀 === TENTATIVE CONNEXION MICROSOFT ===');
      
      const { data, error } = await authService.signInWithMicrosoft();
      
      if (error) {
        console.error('❌ Erreur de connexion:', error);
        setError(`Erreur: ${error.message}`);
      } else {
        console.log('✅ Redirection vers Microsoft initiée');
      }
    } catch (err) {
      console.error('❌ Erreur inattendue:', err);
      setError('Erreur inattendue lors de la connexion');
    } finally {
      setIsLoading(false);
    }
  };

  if (hasOAuthCode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-yellow-50">
        <div className="bg-white rounded-xl shadow-lg p-8 flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Connexion en cours...</h2>
          <p className="text-gray-500">Merci de patienter, votre session est en cours de restauration.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-yellow-50">
      <div className="flex min-h-screen">
        {/* Left side - Hero */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-red-600 to-yellow-500 p-12 flex-col justify-center">
          <div className="max-w-md">
            <div className="flex items-center space-x-4 mb-8">
              <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center p-2">
                <img 
                  src="https://i.postimg.cc/TPXN8mX3/Whats-App-Image-2025-06-12-18-31-34-d5a1cf22-removebg-preview.png" 
                  alt="Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">HelpDesk</h1>
                <p className="text-yellow-100 text-sm">{organizationName}</p>
              </div>
            </div>
            
            <h2 className="text-4xl font-bold text-white mb-6">
              Support Technique Professionnel
            </h2>
            
            <p className="text-red-100 text-lg mb-8">
              Plateforme de gestion de tickets dédiée au {organizationName}.
              Support technique avancé avec IA intégrée pour une résolution optimale.
            </p>

            <div className="space-y-4">
              <div className="flex items-center space-x-3 text-red-100">
                <Shield className="w-5 h-5" />
                <span>Authentification Microsoft sécurisée</span>
              </div>
              <div className="flex items-center space-x-3 text-red-100">
                <Zap className="w-5 h-5" />
                <span>Assistant IA powered by Gemini</span>
              </div>
              <div className="flex items-center space-x-3 text-red-100">
                <Users className="w-5 h-5" />
                <span>Collaboration en temps réel</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Login */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-md w-full">
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
              {/* Bloc logo + titre */}
              <div className="flex flex-col items-center mb-8">
                <img 
                  src="https://i.postimg.cc/TPXN8mX3/Whats-App-Image-2025-06-12-18-31-34-d5a1cf22-removebg-preview.png" 
                  alt="Logo" 
                  className="w-28 h-28 object-contain mb-2 drop-shadow-lg"
                />
                <h2 className="text-3xl font-bold bg-gradient-to-r from-red-600 to-yellow-500 bg-clip-text text-transparent mb-2">
                  Connexion
                </h2>
                <p className="text-gray-600">Accédez à votre espace HelpDesk</p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-red-700 text-sm font-medium">Problème détecté</p>
                      <p className="text-red-600 text-sm mt-1">{error}</p>
                    </div>
                  </div>
                </div>
              )}


              {/* BOUTONS DE LOGIN DYNAMIQUES */}
              {loginMethods.length === 0 && (
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-center">
                  <p className="font-semibold">Aucune méthode de connexion n'est activée.</p>
                  <p className="text-sm mt-2">Veuillez activer au moins une méthode d'authentification dans les paramètres administrateur.</p>
                </div>
              )}
              {loginMethods.includes('microsoft') && (
                <button
                  onClick={handleMicrosoftLogin}
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-red-600 to-yellow-500 hover:from-red-700 hover:to-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center space-x-3 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 mb-4"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                      <span>Connexion en cours...</span>
                    </>
                  ) : (
                    <>
                      <Microsoft className="w-6 h-6" />
                      <span>Continuer avec Microsoft</span>
                    </>
                  )}
                </button>
              )}
              {loginMethods.includes('email') && (
                <button
                  onClick={() => window.location.href = '/auth/email'}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center space-x-3 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                >
                  <span className="font-bold">Connexion par Email</span>
                </button>
              )}

              <div className="mt-8 text-center">
                <p className="text-sm text-gray-500">
                  Sécurisé par Microsoft Azure AD
                </p>
              </div>

              {/* Instructions de configuration urgentes - seulement si erreur */}
              {error && (
                <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-red-700 text-sm font-bold mb-2">🚨 CONFIGURATION AZURE AD REQUISE</p>
                      <div className="text-red-600 text-sm space-y-2">
                        <div className="p-3 bg-white rounded border">
                          <p className="font-semibold mb-2">Instructions urgentes :</p>
                          <ol className="list-decimal list-inside space-y-1 text-xs">
                            <li>Dashboard Supabase → Authentication → Providers → Azure</li>
                            <li>Vérifiez Client ID, Client Secret, Tenant ID</li>
                            <li>URL de redirection : <code className="bg-gray-100 px-1 rounded">https://[PROJET].supabase.co/auth/v1/callback</code></li>
                            <li>Lisez le fichier INSTRUCTIONS_URGENTES.md</li>
                          </ol>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6 pt-6 border-t border-gray-100">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-red-600">99.9%</div>
                    <div className="text-sm text-gray-600">Uptime</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-yellow-500">24/7</div>
                    <div className="text-sm text-gray-600">Support</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-600">IA</div>
                    <div className="text-sm text-gray-600">Powered</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 text-center">
              <p className="text-sm text-gray-500">
                © 2024 {organizationName}. Tous droits réservés.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;