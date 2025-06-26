import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { userService } from '../services/userService';
import { Database } from '../lib/supabase-types';

type User = Database['public']['Tables']['users']['Row'];

export const useUser = () => {
  const { user: authUser, loading: authLoading } = useAuth();
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      // Si pas d'utilisateur authentifié, reset tout
      if (!authUser) {
        setUserProfile(null);
        setLoading(false);
        setError(null);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        console.log('Récupération du profil pour:', authUser.email);
        
        const profile = await userService.getCurrentUserProfile();
        setUserProfile(profile);
        
        // Mettre à jour le dernier login
        await userService.updateLastLogin(authUser.id);
        
        console.log('Profil récupéré avec succès:', profile);
      } catch (err) {
        console.error('Erreur lors de la récupération du profil:', err);
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
        setUserProfile(null);
      } finally {
        setLoading(false);
      }
    };

    // Attendre que l'authentification soit terminée avant de charger le profil
    if (!authLoading) {
      fetchUserProfile();
    }
  }, [authUser, authLoading]);

  const updateProfile = async (updates: Partial<User>) => {
    if (!userProfile) return;

    try {
      const updatedProfile = await userService.updateProfile(userProfile.id, updates);
      setUserProfile(updatedProfile);
      return updatedProfile;
    } catch (err) {
      console.error('Erreur lors de la mise à jour du profil:', err);
      throw err;
    }
  };

  return {
    user: userProfile,
    loading: loading || authLoading,
    error,
    updateProfile,
    isClient: userProfile?.role === 'client',
    isAgent: userProfile?.role === 'agent',
    isAdmin: userProfile?.role === 'admin'
  };
};