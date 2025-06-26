// Service de debug complet pour identifier le problème OAuth
export const debugService = {
  // Vérifier la configuration Supabase
  checkSupabaseConfig: () => {
    const config = {
      url: import.meta.env.VITE_SUPABASE_URL,
      key: import.meta.env.VITE_SUPABASE_ANON_KEY,
      urlValid: import.meta.env.VITE_SUPABASE_URL?.includes('supabase.co'),
      keyValid: import.meta.env.VITE_SUPABASE_ANON_KEY?.length > 50
    };
    
    console.log('🔧 Configuration Supabase:', config);
    return config;
  },

  // Analyser l'URL de retour OAuth
  analyzeOAuthReturn: () => {
    const url = window.location.href;
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.substring(1));
    
    const analysis = {
      fullUrl: url,
      hash: hash,
      accessToken: params.get('access_token'),
      refreshToken: params.get('refresh_token'),
      tokenType: params.get('token_type'),
      expiresIn: params.get('expires_in'),
      error: params.get('error'),
      errorDescription: params.get('error_description'),
      state: params.get('state')
    };
    
    console.log('🔍 Analyse OAuth Return:', analysis);
    return analysis;
  },

  // Tester la connexion à Supabase Auth
  testSupabaseAuth: async () => {
    try {
      const { supabase } = await import('./supabase');
      
      // Test: Vérifier que Supabase fonctionne
      const { data: { session }, error } = await supabase.auth.getSession();
      console.log('🧪 Test Supabase Session:', { session: !!session, error });
      
      return { session, error };
    } catch (err) {
      console.error('❌ Erreur test Supabase:', err);
      return { error: err };
    }
  }
};