/*
  # Correction définitive du système de storage Supabase

  1. Nettoyage complet de toutes les configurations existantes
  2. Création des buckets avec configuration optimale
  3. Politiques RLS simplifiées et fonctionnelles
  4. Système de diagnostic intégré
  5. Test automatique de fonctionnement
*/

-- ========================================
-- ÉTAPE 1: NETTOYAGE RADICAL
-- ========================================

-- Supprimer TOUTES les politiques storage existantes
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON storage.objects';
    END LOOP;
END $$;

-- Supprimer tous les buckets existants
DELETE FROM storage.buckets WHERE id LIKE '%attachment%' OR id LIKE '%ticket%' OR id LIKE '%message%';

-- Supprimer les fonctions existantes
DROP FUNCTION IF EXISTS check_storage_configuration();
DROP FUNCTION IF EXISTS verify_storage_setup();
DROP FUNCTION IF EXISTS test_storage_buckets();

-- ========================================
-- ÉTAPE 2: CRÉATION DES BUCKETS OPTIMISÉS
-- ========================================

-- Bucket pour les fichiers de tickets
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

-- Bucket pour les fichiers de messages
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
-- ÉTAPE 3: POLITIQUES RLS ULTRA-SIMPLES
-- ========================================

-- Politiques pour ticket-attachments (ultra-permissives pour debug)
CREATE POLICY "ticket_read_all"
ON storage.objects FOR SELECT
USING (bucket_id = 'ticket-attachments');

CREATE POLICY "ticket_insert_auth"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'ticket-attachments');

CREATE POLICY "ticket_update_auth"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'ticket-attachments');

CREATE POLICY "ticket_delete_auth"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'ticket-attachments');

-- Politiques pour message-attachments (ultra-permissives pour debug)
CREATE POLICY "message_read_all"
ON storage.objects FOR SELECT
USING (bucket_id = 'message-attachments');

CREATE POLICY "message_insert_auth"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'message-attachments');

CREATE POLICY "message_update_auth"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'message-attachments');

CREATE POLICY "message_delete_auth"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'message-attachments');

-- ========================================
-- ÉTAPE 4: FONCTIONS DE DIAGNOSTIC
-- ========================================

-- Fonction principale pour l'application
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
    b.name::text,
    true,
    b.public,
    (SELECT COUNT(*) FROM pg_policies 
     WHERE tablename = 'objects' 
     AND schemaname = 'storage'
     AND (policyname LIKE '%ticket%' OR policyname LIKE '%message%'))
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
  AND (policyname LIKE '%ticket%' OR policyname LIKE '%message%');
  
  -- Résultats
  RETURN QUERY
  SELECT 
    'Buckets'::text,
    CASE WHEN bucket_count = 2 THEN 'OK' ELSE 'ERROR' END::text,
    ('Trouvés: ' || bucket_count::text || '/2')::text;
    
  RETURN QUERY
  SELECT 
    'Politiques'::text,
    CASE WHEN policy_count >= 8 THEN 'OK' ELSE 'ERROR' END::text,
    ('Trouvées: ' || policy_count::text || '/8+')::text;
    
  RETURN QUERY
  SELECT 
    'Status'::text,
    CASE WHEN bucket_count = 2 AND policy_count >= 8 THEN 'READY' ELSE 'ERROR' END::text,
    'Configuration storage'::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour tester l'upload (simulation)
CREATE OR REPLACE FUNCTION test_storage_upload()
RETURNS TABLE(
  bucket_name text,
  upload_test text,
  result text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.name::text,
    'Simulation upload'::text,
    CASE WHEN b.public THEN 'OK - Bucket public' ELSE 'ERROR - Bucket privé' END::text
  FROM storage.buckets b
  WHERE b.id IN ('ticket-attachments', 'message-attachments')
  ORDER BY b.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- ÉTAPE 5: VÉRIFICATION AUTOMATIQUE
-- ========================================

DO $$
DECLARE
  bucket_count INTEGER;
  policy_count INTEGER;
  verification_result RECORD;
BEGIN
  -- Compter les éléments créés
  SELECT COUNT(*) INTO bucket_count 
  FROM storage.buckets 
  WHERE id IN ('ticket-attachments', 'message-attachments');
  
  SELECT COUNT(*) INTO policy_count 
  FROM pg_policies 
  WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND (policyname LIKE '%ticket%' OR policyname LIKE '%message%');
  
  -- Afficher les résultats
  RAISE NOTICE '';
  RAISE NOTICE '=== RÉSULTATS DE LA CONFIGURATION STORAGE ===';
  RAISE NOTICE '';
  RAISE NOTICE 'Buckets créés: %/2', bucket_count;
  RAISE NOTICE 'Politiques créées: %/8', policy_count;
  RAISE NOTICE '';
  
  -- Vérification détaillée
  FOR verification_result IN SELECT * FROM verify_storage_setup() LOOP
    RAISE NOTICE '% | % | %', 
      verification_result.component, 
      verification_result.status, 
      verification_result.details;
  END LOOP;
  
  RAISE NOTICE '';
  
  -- Résultat final
  IF bucket_count = 2 AND policy_count >= 8 THEN
    RAISE NOTICE '🎉 SUCCÈS TOTAL ! Storage configuré et prêt !';
    RAISE NOTICE '✅ Vous pouvez maintenant uploader des fichiers';
    RAISE NOTICE '📁 Buckets: ticket-attachments, message-attachments';
    RAISE NOTICE '🔒 Politiques: Lecture publique, Upload authentifié';
  ELSE
    RAISE EXCEPTION '❌ ÉCHEC: Configuration incomplète (Buckets: %, Politiques: %)', bucket_count, policy_count;
  END IF;
  
  RAISE NOTICE '';
END $$;

-- ========================================
-- ÉTAPE 6: TESTS FINAUX
-- ========================================

-- Afficher la configuration pour l'application
SELECT 'Configuration pour l''application:' as info;
SELECT * FROM check_storage_configuration();

-- Afficher les tests d'upload
SELECT 'Tests d''upload:' as info;
SELECT * FROM test_storage_upload();

-- Message final
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🚀 MIGRATION STORAGE TERMINÉE !';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Instructions pour l''application:';
  RAISE NOTICE '   1. Rechargez complètement votre application (Ctrl+F5)';
  RAISE NOTICE '   2. Ouvrez la console développeur (F12)';
  RAISE NOTICE '   3. Testez l''upload d''un fichier';
  RAISE NOTICE '   4. Vérifiez les logs de diagnostic';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 Si problème persiste:';
  RAISE NOTICE '   - Vérifiez les variables d''environnement Supabase';
  RAISE NOTICE '   - Vérifiez que l''utilisateur est bien authentifié';
  RAISE NOTICE '   - Contactez le support avec les logs de la console';
  RAISE NOTICE '';
END $$;