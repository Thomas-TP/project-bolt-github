/*
  # Correction des politiques RLS pour les utilisateurs

  1. Problème identifié
    - Certains utilisateurs ne sont pas visibles dans la gestion des utilisateurs
    - Les politiques RLS peuvent être trop restrictives
    - Problème potentiel avec la création automatique des profils

  2. Solution
    - Simplifier les politiques RLS pour les admins
    - Corriger la fonction de création automatique des profils
    - Ajouter une fonction de diagnostic pour identifier les utilisateurs manquants
*/

-- Désactiver temporairement RLS pour nettoyer
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Supprimer toutes les politiques existantes
DROP POLICY IF EXISTS "users_can_read_own_profile" ON users;
DROP POLICY IF EXISTS "users_can_create_own_profile" ON users;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON users;
DROP POLICY IF EXISTS "agents_can_read_all_profiles" ON users;
DROP POLICY IF EXISTS "admins_can_update_all_profiles" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Agents can view all users" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;

-- Réactiver RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Politique 1: Les utilisateurs peuvent lire leur propre profil
CREATE POLICY "users_read_own_profile" ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Politique 2: Les utilisateurs peuvent créer leur propre profil
CREATE POLICY "users_create_own_profile" ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Politique 3: Les utilisateurs peuvent mettre à jour leur propre profil
CREATE POLICY "users_update_own_profile" ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Politique 4: Les admins peuvent tout voir et tout faire
CREATE POLICY "admins_full_access" ON users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users admin_user
      WHERE admin_user.id = auth.uid() 
      AND admin_user.role = 'admin'
      AND admin_user.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users admin_user
      WHERE admin_user.id = auth.uid() 
      AND admin_user.role = 'admin'
      AND admin_user.is_active = true
    )
  );

-- Politique 5: Les agents peuvent lire tous les profils
CREATE POLICY "agents_read_all_profiles" ON users
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id OR
    EXISTS (
      SELECT 1 FROM users agent_user
      WHERE agent_user.id = auth.uid() 
      AND agent_user.role IN ('agent', 'admin')
      AND agent_user.is_active = true
    )
  );

-- Corriger la fonction de création automatique des profils
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insérer le profil utilisateur avec gestion d'erreur
  INSERT INTO public.users (id, email, full_name, avatar_url, role, is_active, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name', 
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'display_name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.raw_user_meta_data->>'avatar_url',
    'client', -- Rôle par défaut
    true,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, users.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
    updated_at = now();
    
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- En cas d'erreur, on continue quand même
  RAISE WARNING 'Erreur lors de la création du profil utilisateur: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recréer le trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Fonction pour synchroniser les utilisateurs manquants
CREATE OR REPLACE FUNCTION sync_missing_users()
RETURNS TABLE(
  user_id uuid,
  email text,
  action text
) AS $$
DECLARE
  auth_user RECORD;
  user_exists boolean;
BEGIN
  -- Parcourir tous les utilisateurs auth qui n'ont pas de profil
  FOR auth_user IN 
    SELECT au.id, au.email, au.raw_user_meta_data, au.created_at
    FROM auth.users au
    LEFT JOIN public.users pu ON au.id = pu.id
    WHERE pu.id IS NULL
  LOOP
    -- Créer le profil manquant
    INSERT INTO public.users (id, email, full_name, avatar_url, role, is_active, created_at, updated_at)
    VALUES (
      auth_user.id,
      auth_user.email,
      COALESCE(
        auth_user.raw_user_meta_data->>'full_name', 
        auth_user.raw_user_meta_data->>'name',
        auth_user.raw_user_meta_data->>'display_name',
        split_part(auth_user.email, '@', 1)
      ),
      auth_user.raw_user_meta_data->>'avatar_url',
      'client',
      true,
      auth_user.created_at,
      now()
    );
    
    -- Retourner l'information
    RETURN QUERY SELECT auth_user.id, auth_user.email, 'CREATED'::text;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction de diagnostic des utilisateurs
CREATE OR REPLACE FUNCTION diagnose_users()
RETURNS TABLE(
  component text,
  status text,
  details text
) AS $$
DECLARE
  auth_count integer;
  profile_count integer;
  missing_count integer;
  admin_count integer;
  agent_count integer;
  client_count integer;
BEGIN
  -- Compter les utilisateurs auth
  SELECT COUNT(*) INTO auth_count FROM auth.users;
  
  -- Compter les profils
  SELECT COUNT(*) INTO profile_count FROM public.users;
  
  -- Compter les utilisateurs manquants
  SELECT COUNT(*) INTO missing_count 
  FROM auth.users au
  LEFT JOIN public.users pu ON au.id = pu.id
  WHERE pu.id IS NULL;
  
  -- Compter par rôle
  SELECT COUNT(*) INTO admin_count FROM public.users WHERE role = 'admin';
  SELECT COUNT(*) INTO agent_count FROM public.users WHERE role = 'agent';
  SELECT COUNT(*) INTO client_count FROM public.users WHERE role = 'client';
  
  -- Retourner les résultats
  RETURN QUERY SELECT 'Utilisateurs Auth'::text, 'INFO'::text, auth_count::text;
  RETURN QUERY SELECT 'Profils créés'::text, 'INFO'::text, profile_count::text;
  RETURN QUERY SELECT 'Profils manquants'::text, 
    CASE WHEN missing_count = 0 THEN 'OK' ELSE 'WARNING' END::text, 
    missing_count::text;
  RETURN QUERY SELECT 'Administrateurs'::text, 'INFO'::text, admin_count::text;
  RETURN QUERY SELECT 'Agents'::text, 'INFO'::text, agent_count::text;
  RETURN QUERY SELECT 'Clients'::text, 'INFO'::text, client_count::text;
  
  -- Statut global
  RETURN QUERY SELECT 'Synchronisation'::text,
    CASE WHEN missing_count = 0 THEN 'OK' ELSE 'NEEDS_SYNC' END::text,
    'Utilisateurs synchronisés'::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Exécuter la synchronisation des utilisateurs manquants
DO $$
DECLARE
  sync_result RECORD;
  sync_count integer := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== SYNCHRONISATION DES UTILISATEURS ===';
  RAISE NOTICE '';
  
  -- Synchroniser les utilisateurs manquants
  FOR sync_result IN SELECT * FROM sync_missing_users() LOOP
    sync_count := sync_count + 1;
    RAISE NOTICE 'Profil créé: % (ID: %)', sync_result.email, sync_result.user_id;
  END LOOP;
  
  IF sync_count = 0 THEN
    RAISE NOTICE 'Aucun utilisateur manquant trouvé';
  ELSE
    RAISE NOTICE 'Total: % profils créés', sync_count;
  END IF;
  
  RAISE NOTICE '';
END $$;

-- Diagnostic final
DO $$
DECLARE
  diag_result RECORD;
BEGIN
  RAISE NOTICE '=== DIAGNOSTIC DES UTILISATEURS ===';
  RAISE NOTICE '';
  
  FOR diag_result IN SELECT * FROM diagnose_users() LOOP
    RAISE NOTICE '% | % | %', diag_result.component, diag_result.status, diag_result.details;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Correction terminée !';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Actions effectuées :';
  RAISE NOTICE '   - Politiques RLS simplifiées et corrigées';
  RAISE NOTICE '   - Fonction de création automatique améliorée';
  RAISE NOTICE '   - Synchronisation des utilisateurs manquants';
  RAISE NOTICE '   - Diagnostic complet disponible';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 Pour tester :';
  RAISE NOTICE '   1. Rechargez votre application';
  RAISE NOTICE '   2. Allez dans Gestion des Utilisateurs';
  RAISE NOTICE '   3. Tous les utilisateurs devraient être visibles';
  RAISE NOTICE '';
END $$;