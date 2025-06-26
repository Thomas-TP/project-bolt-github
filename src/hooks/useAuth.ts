import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../utils/supabase';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🔍 useAuth: Initialisation...');
    
    // Get initial session
    console.log('🔍 useAuth: Récupération de la session initiale...');
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('✅ useAuth: Session récupérée:', session?.user?.email || 'null');
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    console.log('🔍 useAuth: Configuration du listener d\'authentification...');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔄 useAuth: Changement d\'état d\'authentification:', event, session?.user?.email || 'null');
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => {
      console.log('🧹 useAuth: Nettoyage de la subscription');
      subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
};