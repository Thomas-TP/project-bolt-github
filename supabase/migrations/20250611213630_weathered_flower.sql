/*
  # Configuration définitive du Storage Supabase
  
  Cette migration va :
  1. Nettoyer complètement l'existant
  2. Créer les buckets avec la bonne configuration
  3. Créer toutes les politiques RLS nécessaires
  4. Tester que tout fonctionne
*/

-- ========================================
-- ÉTAPE 1: NETTOYAGE COMPLET
-- ========================================

DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Supprimer toutes les politiques storage existantes
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage'
        AND (policyname ILIKE '%ticket%' OR policyname ILIKE '%message%' OR policyname ILIKE '%attachment%')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON storage.objects';
    END LOOP;
    
    -- Supprimer les buckets existants
    DELETE FROM storage.buckets WHERE id IN ('ticket-attachments', 'message-attachments');
    
    -- Supprimer les fonctions existantes
    DROP FUNCTION IF EXISTS check_storage_configuration();
    DROP FUNCTION IF EXISTS verify_storage_setup();
    
    RAISE NOTICE 'Nettoyage terminé';
END $$;

-- ========================================
-- ÉTAPE 2: CRÉATION DES BUCKETS
-- ========================================

-- Créer le bucket ticket-attachments
INSERT INTO storage.buckets (
    id, 
    name, 
    public, 
    file_size_limit, 
    allowed_mime_types
) VALUES (
    'ticket-attachments',
    'ticket-attachments',
    true,
    10485760, -- 10MB
    ARRAY[
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain', 'text/csv',
        'application/zip', 'application/x-rar-compressed'
    ]
);

-- Créer le bucket message-attachments
INSERT INTO storage.buckets (
    id, 
    name, 
    public, 
    file_size_limit, 
    allowed_mime_types
) VALUES (
    'message-attachments',
    'message-attachments',
    true,
    10485760, -- 10MB
    ARRAY[
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain', 'text/csv',
        'application/zip', 'application/x-rar-compressed'
    ]
);

-- ========================================
-- ÉTAPE 3: POLITIQUES RLS POUR TICKET-ATTACHMENTS
-- ========================================

-- Lecture publique
CREATE POLICY "ticket_files_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'ticket-attachments');

-- Upload pour utilisateurs authentifiés
CREATE POLICY "ticket_files_auth_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'ticket-attachments');

-- Mise à jour pour utilisateurs authentifiés
CREATE POLICY "ticket_files_auth_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'ticket-attachments')
WITH CHECK (bucket_id = 'ticket-attachments');

-- Suppression pour utilisateurs authentifiés
CREATE POLICY "ticket_files_auth_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'ticket-attachments');

-- ========================================
-- ÉTAPE 4: POLITIQUES RLS POUR MESSAGE-ATTACHMENTS
-- ========================================

-- Lecture publique
CREATE POLICY "message_files_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'message-attachments');

-- Upload pour utilisateurs authentifiés
CREATE POLICY "message_files_auth_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'message-attachments');

-- Mise à jour pour utilisateurs authentifiés
CREATE POLICY "message_files_auth_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'message-attachments')
WITH CHECK (bucket_id = 'message-attachments');

-- Suppression pour utilisateurs authentifiés
CREATE POLICY "message_files_auth_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'message-attachments');

-- ========================================
-- ÉTAPE 5: FONCTIONS DE VÉRIFICATION
-- ========================================

-- Fonction pour vérifier la configuration (utilisée par l'app)
CREATE OR REPLACE FUNCTION check_storage_configuration()
RETURNS TABLE(
  bucket_name text,
  bucket_exists boolean,
  is_public boolean,
  policies_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.name::text as bucket_name,
    true as bucket_exists,
    b.public as is_public,
    (SELECT COUNT(*) FROM pg_policies 
     WHERE tablename = 'objects' 
     AND schemaname = 'storage'
     AND policyname LIKE '%' || replace(b.name, '-', '_') || '%') as policies_count
  FROM storage.buckets b
  WHERE b.id IN ('ticket-attachments', 'message-attachments')
  ORDER BY b.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction de diagnostic complet
CREATE OR REPLACE FUNCTION verify_storage_setup()
RETURNS TABLE(
  component text,
  status text,
  details text
) AS $$
DECLARE
  bucket_count INTEGER;
  policy_count INTEGER;
BEGIN
  -- Compter les buckets
  SELECT COUNT(*) INTO bucket_count 
  FROM storage.buckets 
  WHERE id IN ('ticket-attachments', 'message-attachments');
  
  -- Compter les politiques
  SELECT COUNT(*) INTO policy_count 
  FROM pg_policies 
  WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND (policyname LIKE '%ticket_files%' OR policyname LIKE '%message_files%');
  
  -- Retourner les résultats
  RETURN QUERY
  SELECT 
    'Buckets'::text as component,
    CASE WHEN bucket_count = 2 THEN 'OK' ELSE 'ERROR' END::text as status,
    ('Trouvés: ' || bucket_count::text || '/2')::text as details;
    
  RETURN QUERY
  SELECT 
    'Politiques'::text as component,
    CASE WHEN policy_count >= 8 THEN 'OK' ELSE 'ERROR' END::text as status,
    ('Trouvées: ' || policy_count::text || '/8')::text as details;
    
  RETURN QUERY
  SELECT 
    'Configuration'::text as component,
    CASE WHEN bucket_count = 2 AND policy_count >= 8 THEN 'READY' ELSE 'ERROR' END::text as status,
    'Storage prêt pour utilisation'::text as details;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- ÉTAPE 6: TEST AUTOMATIQUE
-- ========================================

DO $$
DECLARE
  bucket_count INTEGER;
  policy_count INTEGER;
  all_good BOOLEAN := true;
BEGIN
  -- Vérifier les buckets
  SELECT COUNT(*) INTO bucket_count 
  FROM storage.buckets 
  WHERE id IN ('ticket-attachments', 'message-attachments');
  
  IF bucket_count != 2 THEN
    all_good := false;
    RAISE EXCEPTION 'ERREUR: Buckets manquants (trouvés: %/2)', bucket_count;
  END IF;
  
  -- Vérifier les politiques
  SELECT COUNT(*) INTO policy_count 
  FROM pg_policies 
  WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND (policyname LIKE '%ticket_files%' OR policyname LIKE '%message_files%');
  
  IF policy_count < 8 THEN
    all_good := false;
    RAISE EXCEPTION 'ERREUR: Politiques manquantes (trouvées: %/8)', policy_count;
  END IF;
  
  -- Succès !
  RAISE NOTICE 'SUCCÈS: Configuration storage complète ! Buckets: %, Politiques: %', bucket_count, policy_count;
END $$;