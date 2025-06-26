import { supabase } from '../utils/supabase';
import { Database } from '../lib/supabase-types';

type User = Database['public']['Tables']['users']['Row'];
type UserUpdate = Database['public']['Tables']['users']['Update'];
type UserInsert = Database['public']['Tables']['users']['Insert'];

export const userService = {
  // Récupérer le profil utilisateur actuel
  async getCurrentUserProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non connecté');

    console.log('Recherche du profil pour l\'utilisateur:', user.id, user.email);

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.log('Erreur lors de la récupération du profil:', error);
      
      // Si l'utilisateur n'existe pas, on le crée
      if (error.code === 'PGRST116') {
        console.log('Profil utilisateur non trouvé, création en cours...');
        return await this.createUserProfile(user);
      }
      
      throw new Error(`Erreur base de données: ${error.message}`);
    }
    
    console.log('Profil trouvé:', data);
    return data;
  },

  // Créer un profil utilisateur pour un nouvel utilisateur
  async createUserProfile(authUser: any) {
    console.log('Création du profil pour:', authUser.email);
    
    // Extraire les informations du metadata Azure AD
    const metadata = authUser.user_metadata || {};
    console.log('Metadata utilisateur:', metadata);
    
    const userProfile: UserInsert = {
      id: authUser.id,
      email: authUser.email,
      full_name: metadata.full_name || metadata.name || null,
      role: 'client', // Rôle par défaut
      avatar_url: metadata.avatar_url || metadata.picture || null,
      is_active: true,
      last_login: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('Tentative de création du profil:', userProfile);

    const { data, error } = await supabase
      .from('users')
      .insert(userProfile)
      .select()
      .single();

    if (error) {
      console.error('Erreur lors de la création du profil:', error);
      
      // Si le profil existe déjà, essayer de le récupérer
      if (error.code === '23505') {
        console.log('Profil existe déjà, tentative de récupération...');
        const { data: existingData, error: selectError } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single();
        
        if (selectError) {
          throw new Error(`Impossible de récupérer le profil existant: ${selectError.message}`);
        }
        
        return existingData;
      }
      
      throw new Error(`Impossible de créer le profil: ${error.message}`);
    }

    console.log('Profil créé avec succès:', data);
    return data;
  },

  // Mettre à jour le profil utilisateur
  async updateProfile(userId: string, updates: UserUpdate) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Récupérer tous les agents (pour assignation des tickets)
  async getAgents() {
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, email, avatar_url')
      .eq('role', 'agent')
      .eq('is_active', true)
      .order('full_name');

    if (error) throw error;
    return data;
  },

  // Récupérer tous les utilisateurs (admin seulement) - VERSION ULTRA-CORRIGÉE
  async getAllUsers() {
    console.log('🔍 === CHARGEMENT UTILISATEURS (VERSION CORRIGÉE) ===');
    
    try {
      // D'abord, synchroniser les utilisateurs manquants
      console.log('🔄 Synchronisation préalable...');
      await this.syncMissingUsers();
      
      // Ensuite, récupérer tous les utilisateurs avec une requête simple
      console.log('📊 Récupération de tous les utilisateurs...');
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erreur lors du chargement des utilisateurs:', error);
        
        // Essayer une requête encore plus simple
        console.log('🔄 Tentative avec requête simplifiée...');
        const { data: simpleData, error: simpleError } = await supabase
          .from('users')
          .select('id, email, full_name, role, is_active, created_at, updated_at');
          
        if (simpleError) {
          throw new Error(`Impossible de charger les utilisateurs: ${simpleError.message}`);
        }
        
        console.log('✅ Utilisateurs chargés avec requête simplifiée:', simpleData?.length);
        return simpleData;
      }
      
      console.log(`✅ ${data?.length || 0} utilisateurs chargés avec succès`);
      console.log('📊 Répartition:', {
        admins: data?.filter(u => u.role === 'admin').length || 0,
        agents: data?.filter(u => u.role === 'agent').length || 0,
        clients: data?.filter(u => u.role === 'client').length || 0,
        actifs: data?.filter(u => u.is_active).length || 0,
        inactifs: data?.filter(u => !u.is_active).length || 0
      });
      
      return data;
    } catch (error) {
      console.error('❌ Erreur critique dans getAllUsers:', error);
      throw error;
    }
  },

  // Synchroniser les utilisateurs manquants - VERSION CORRIGÉE
  async syncMissingUsers() {
    try {
      console.log('🔄 === SYNCHRONISATION UTILISATEURS MANQUANTS ===');
      
      const { data, error } = await supabase.rpc('sync_missing_users');
      
      if (error) {
        console.error('❌ Erreur lors de la synchronisation RPC:', error);
        
        // Fallback: synchronisation manuelle
        console.log('🔄 Fallback: synchronisation manuelle...');
        return await this.manualSyncUsers();
      }
      
      if (data && data.created_count > 0) {
        console.log(`✅ ${data.created_count} profils manquants créés via RPC`);
      } else {
        console.log('✅ Aucun utilisateur manquant (RPC)');
      }
      
      return data;
    } catch (error) {
      console.error('❌ Erreur lors de la synchronisation:', error);
      
      // Fallback: synchronisation manuelle
      console.log('🔄 Fallback: synchronisation manuelle...');
      return await this.manualSyncUsers();
    }
  },

  // Synchronisation manuelle en cas d'échec de la RPC
  async manualSyncUsers() {
    try {
      console.log('🔧 Synchronisation manuelle des utilisateurs...');
      
      // Récupérer les utilisateurs auth
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      
      if (authError) {
        console.error('❌ Impossible de récupérer les utilisateurs auth:', authError);
        return { success: false, created_count: 0, error: authError.message };
      }
      
      // Récupérer les profils existants
      const { data: existingProfiles, error: profileError } = await supabase
        .from('users')
        .select('id');
        
      if (profileError) {
        console.error('❌ Impossible de récupérer les profils existants:', profileError);
        return { success: false, created_count: 0, error: profileError.message };
      }
      
      const existingIds = new Set(existingProfiles?.map(p => p.id) || []);
      const missingUsers = authUsers.users.filter(u => !existingIds.has(u.id));
      
      console.log(`📊 Utilisateurs auth: ${authUsers.users.length}, Profils: ${existingProfiles?.length}, Manquants: ${missingUsers.length}`);
      
      let createdCount = 0;
      
      for (const authUser of missingUsers) {
        try {
          const userProfile: UserInsert = {
            id: authUser.id,
            email: authUser.email || '',
            full_name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || null,
            role: 'client',
            avatar_url: authUser.user_metadata?.avatar_url || null,
            is_active: true,
            created_at: authUser.created_at,
            updated_at: new Date().toISOString()
          };
          
          const { error: insertError } = await supabase
            .from('users')
            .insert(userProfile);
            
          if (insertError) {
            console.error(`❌ Erreur création profil ${authUser.email}:`, insertError);
          } else {
            console.log(`✅ Profil créé: ${authUser.email}`);
            createdCount++;
          }
        } catch (err) {
          console.error(`❌ Erreur lors de la création du profil ${authUser.email}:`, err);
        }
      }
      
      console.log(`✅ Synchronisation manuelle terminée: ${createdCount} profils créés`);
      
      return {
        success: true,
        created_count: createdCount,
        message: `${createdCount} profils créés manuellement`
      };
    } catch (error) {
      console.error('❌ Erreur lors de la synchronisation manuelle:', error);
      return {
        success: false,
        created_count: 0,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  },

  // Diagnostic des utilisateurs - VERSION CORRIGÉE
  async diagnoseUsers() {
    try {
      console.log('🔍 === DIAGNOSTIC UTILISATEURS ===');
      
      const { data, error } = await supabase.rpc('diagnose_users');
      
      if (error) {
        console.error('❌ Erreur lors du diagnostic RPC:', error);
        
        // Fallback: diagnostic manuel
        return await this.manualDiagnose();
      }
      
      console.log('🔍 Diagnostic des utilisateurs (RPC):', data);
      return data;
    } catch (error) {
      console.error('❌ Erreur lors du diagnostic:', error);
      return await this.manualDiagnose();
    }
  },

  // Diagnostic manuel
  async manualDiagnose() {
    try {
      console.log('🔧 Diagnostic manuel...');
      
      const { count: profileCount, error: profileError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });
        
      if (profileError) {
        console.error('❌ Erreur comptage profils:', profileError);
        return { error: profileError.message };
      }
      
      const result = {
        profiles: profileCount || 0,
        status: 'MANUAL_DIAGNOSTIC',
        timestamp: new Date().toISOString()
      };
      
      console.log('📊 Diagnostic manuel:', result);
      return result;
    } catch (error) {
      console.error('❌ Erreur diagnostic manuel:', error);
      return { error: error instanceof Error ? error.message : 'Erreur inconnue' };
    }
  },

  // Rechercher des utilisateurs - AMÉLIORÉ
  async searchUsers(query: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .or(`full_name.ilike.%${query}%,email.ilike.%${query}%,company.ilike.%${query}%`)
      .order('full_name');

    if (error) {
      console.error('Erreur lors de la recherche d\'utilisateurs:', error);
      throw error;
    }
    
    return data;
  },

  // Mettre à jour le dernier login
  async updateLastLogin(userId: string) {
    const { error } = await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', userId);

    if (error) console.error('Erreur mise à jour last_login:', error);
  },

  // Changer le rôle d'un utilisateur (admin seulement) - VERSION ULTRA-CORRIGÉE
  async updateUserRole(userId: string, role: User['role']) {
    console.log('🔄 === MISE À JOUR RÔLE UTILISATEUR (VERSION CORRIGÉE) ===');
    console.log('📋 Paramètres:', { userId, role });
    
    try {
      // Étape 1: Vérifier que l'utilisateur existe
      console.log('🔍 Vérification existence utilisateur...');
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id, email, role, full_name')
        .eq('id', userId)
        .single();

      if (checkError) {
        console.error('❌ Erreur lors de la vérification:', checkError);
        
        if (checkError.code === 'PGRST116') {
          throw new Error('Utilisateur non trouvé dans la base de données');
        }
        
        throw new Error(`Erreur de vérification: ${checkError.message}`);
      }

      console.log('✅ Utilisateur trouvé:', {
        id: existingUser.id,
        email: existingUser.email,
        currentRole: existingUser.role,
        newRole: role
      });

      // Étape 2: Effectuer la mise à jour avec une requête ultra-simple
      console.log('🔄 Mise à jour du rôle...');
      const { data, error } = await supabase
        .from('users')
        .update({ 
          role: role,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select('id, email, role, full_name, updated_at')
        .single();

      if (error) {
        console.error('❌ Erreur lors de la mise à jour:', error);
        
        // Messages d'erreur spécifiques
        if (error.code === 'PGRST116') {
          throw new Error('Utilisateur non trouvé lors de la mise à jour');
        } else if (error.code === '42501') {
          throw new Error('Permissions insuffisantes pour modifier ce rôle');
        } else if (error.message.includes('policy')) {
          throw new Error('Accès refusé par les politiques de sécurité');
        } else if (error.message.includes('permission')) {
          throw new Error('Permissions insuffisantes');
        } else {
          throw new Error(`Erreur de base de données: ${error.message}`);
        }
      }

      if (!data) {
        throw new Error('Aucune donnée retournée après la mise à jour');
      }
      
      console.log('✅ Rôle mis à jour avec succès:', {
        id: data.id,
        email: data.email,
        oldRole: existingUser.role,
        newRole: data.role,
        updatedAt: data.updated_at
      });
      
      return data;
    } catch (error) {
      console.error('❌ Erreur dans updateUserRole:', error);
      throw error;
    }
  },

  // Désactiver/Activer un utilisateur - CORRIGÉ
  async toggleUserStatus(userId: string, isActive: boolean) {
    console.log('🔄 === CHANGEMENT STATUT UTILISATEUR ===');
    console.log('📋 Paramètres:', { userId, isActive });
    
    try {
      const { data, error } = await supabase
        .from('users')
        .update({ 
          is_active: isActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select('id, email, is_active, updated_at')
        .single();

      if (error) {
        console.error('❌ Erreur lors du changement de statut:', error);
        throw new Error(`Erreur lors du changement de statut: ${error.message}`);
      }
      
      console.log('✅ Statut mis à jour avec succès:', data);
      return data;
    } catch (error) {
      console.error('❌ Erreur dans toggleUserStatus:', error);
      throw error;
    }
  },

  // Mettre à jour les informations complètes d'un utilisateur - CORRIGÉ
  async updateUserInfo(userId: string, updates: Partial<User>) {
    console.log('🔄 === MISE À JOUR INFORMATIONS UTILISATEUR ===');
    console.log('📋 Paramètres:', { userId, updates });
    
    try {
      const { data, error } = await supabase
        .from('users')
        .update({ 
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('❌ Erreur lors de la mise à jour:', error);
        throw new Error(`Erreur lors de la mise à jour: ${error.message}`);
      }
      
      console.log('✅ Informations mises à jour avec succès:', data);
      return data;
    } catch (error) {
      console.error('❌ Erreur dans updateUserInfo:', error);
      throw error;
    }
  },

  // Obtenir les statistiques des utilisateurs - CORRIGÉ
  async getUserStats() {
    try {
      console.log('📊 Calcul des statistiques utilisateurs...');
      
      const { data, error } = await supabase
        .from('users')
        .select('role, is_active, created_at');

      if (error) {
        console.error('Erreur lors du chargement des stats:', error);
        throw error;
      }

      const now = new Date();
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const stats = {
        total: data?.length || 0,
        active: data?.filter(u => u.is_active).length || 0,
        inactive: data?.filter(u => !u.is_active).length || 0,
        admins: data?.filter(u => u.role === 'admin').length || 0,
        agents: data?.filter(u => u.role === 'agent').length || 0,
        clients: data?.filter(u => u.role === 'client').length || 0,
        newThisWeek: data?.filter(u => new Date(u.created_at) > lastWeek).length || 0,
        newThisMonth: data?.filter(u => new Date(u.created_at) > lastMonth).length || 0
      };

      console.log('📊 Statistiques calculées:', stats);
      return stats;
    } catch (error) {
      console.error('❌ Erreur calcul statistiques:', error);
      throw error;
    }
  },

  // Obtenir le profil complet d'un utilisateur par son id
  async getUserProfileById(userId: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) throw error;
    return data;
  }
};