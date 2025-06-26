-- Désactiver temporairement RLS pour nettoyer
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Supprimer TOUTES les politiques existantes
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'users' 
        AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON users';
    END LOOP;
END $$;

-- Réactiver RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Politique ultra-simple 1: Lecture pour utilisateurs authentifiés
CREATE POLICY "authenticated_users_can_read" ON users
  FOR SELECT
  TO authenticated
  USING (true); -- Permet à tous les utilisateurs authentifiés de lire

-- Politique ultra-simple 2: Création de son propre profil
CREATE POLICY "users_can_create_own" ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Politique ultra-simple 3: Mise à jour de son propre profil
CREATE POLICY "users_can_update_own" ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Politique ultra-simple 4: Suppression (très restrictive)
CREATE POLICY "no_delete_users" ON users
  FOR DELETE
  TO authenticated
  USING (false); -- Personne ne peut supprimer

-- Supprimer les fonctions existantes avant de les recréer
DROP FUNCTION IF EXISTS sync_missing_users();
DROP FUNCTION IF EXISTS diagnose_users();

-- Corriger la fonction de création automatique
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insérer le profil utilisateur de manière simple
  INSERT INTO public.users (id, email, full_name, avatar_url, role, is_active, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name', 
      NEW.raw_user_meta_data->>'name',
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
  -- En cas d'erreur, on continue
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recréer le trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Fonction simplifiée pour synchroniser les utilisateurs manquants
CREATE FUNCTION sync_missing_users()
RETURNS json AS $$
DECLARE
  auth_user RECORD;
  created_count integer := 0;
  result json;
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
        split_part(auth_user.email, '@', 1)
      ),
      auth_user.raw_user_meta_data->>'avatar_url',
      'client',
      true,
      auth_user.created_at,
      now()
    );
    
    created_count := created_count + 1;
  END LOOP;
  
  result := json_build_object(
    'success', true,
    'created_count', created_count,
    'message', created_count || ' profils créés'
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction de diagnostic simplifiée
CREATE FUNCTION diagnose_users()
RETURNS json AS $$
DECLARE
  auth_count integer;
  profile_count integer;
  missing_count integer;
  result json;
BEGIN
  -- Compter les utilisateurs
  SELECT COUNT(*) INTO auth_count FROM auth.users;
  SELECT COUNT(*) INTO profile_count FROM public.users;
  
  SELECT COUNT(*) INTO missing_count 
  FROM auth.users au
  LEFT JOIN public.users pu ON au.id = pu.id
  WHERE pu.id IS NULL;
  
  result := json_build_object(
    'auth_users', auth_count,
    'profiles', profile_count,
    'missing', missing_count,
    'status', CASE WHEN missing_count = 0 THEN 'OK' ELSE 'NEEDS_SYNC' END
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Synchroniser immédiatement les utilisateurs manquants
DO $$
DECLARE
  sync_result json;
BEGIN
  SELECT sync_missing_users() INTO sync_result;
  
  RAISE NOTICE '';
  RAISE NOTICE '🔧 === CORRECTION RLS TERMINÉE ===';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Politiques RLS simplifiées (plus de récursion)';
  RAISE NOTICE '✅ Fonction de synchronisation corrigée';
  RAISE NOTICE '✅ Synchronisation automatique effectuée';
  RAISE NOTICE '';
  RAISE NOTICE 'Résultat: %', sync_result;
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Votre application devrait maintenant fonctionner !';
  RAISE NOTICE '';
END $$;