import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

console.log('🔧 Configuration Supabase:', {
  url: supabaseUrl,
  keyPresent: !!supabaseAnonKey,
  keyLength: supabaseAnonKey.length
});

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
});

export const authService = {
  signInWithMicrosoft: async () => {
    console.log('🚀 Démarrage connexion Microsoft...');
    console.log('🔧 URL Supabase:', supabaseUrl);
    
    // Ajout du paramètre project_id pour résoudre l'erreur "Project not specified"
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        scopes: 'openid email profile',
        redirectTo: window.location.origin,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
          project_id: 'holvmacfhxfteqcirfyt' // ID du projet Supabase
        }
      }
    });
    
    console.log('📤 Réponse OAuth:', { data, error });
    return { data, error };
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  getCurrentUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    return { user, error };
  }
};

