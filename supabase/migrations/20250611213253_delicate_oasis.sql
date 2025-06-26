/*
  # Correction définitive des buckets Storage - Version finale

  1. Nettoyage complet de l'existant
  2. Création des buckets avec configuration complète
  3. Politiques de sécurité appropriées
  4. Fonctions de vérification corrigées
*/

-- Étape 1: Nettoyer complètement l'existant
DO $$
BEGIN
  -- Supprimer toutes les politiques storage existantes
  DROP POLICY IF EXISTS "Public read access for ticket attachments" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can upload ticket attachments" ON storage.objects;
  DROP POLICY IF EXISTS "Agents can delete ticket attachments" ON storage.objects;
  DROP POLICY IF EXISTS "Public read access for message attachments" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can upload message attachments" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete own message attachments" ON storage.objects;
  DROP POLICY IF EXISTS "ticket_attachments_select_policy" ON storage.objects;
  DROP POLICY IF EXISTS "ticket_attachments_insert_policy" ON storage.objects;
  DROP POLICY IF EXISTS "ticket_attachments_update_policy" ON storage.objects;
  DROP POLICY IF EXISTS "ticket_attachments_delete_policy" ON storage.objects;
  DROP POLICY IF EXISTS "message_attachments_select_policy" ON storage.objects;
  DROP POLICY IF EXISTS "message_attachments_insert_policy" ON storage.objects;
  DROP POLICY IF EXISTS "message_attachments_update_policy" ON storage.objects;
  DROP POLICY IF EXISTS "message_attachments_delete_policy" ON storage.objects;
  DROP POLICY IF EXISTS "ticket_attachments_public_read" ON storage.objects;
  DROP POLICY IF EXISTS "ticket_attachments_auth_upload" ON storage.objects;
  DROP POLICY IF EXISTS "ticket_attachments_auth_delete" ON storage.objects;
  DROP POLICY IF EXISTS "message_attachments_public_read" ON storage.objects;
  DROP POLICY IF EXISTS "message_attachments_auth_upload" ON storage.objects;
  DROP POLICY IF EXISTS "message_attachments_auth_delete" ON storage.objects;
  DROP POLICY IF EXISTS "Allow public read for ticket attachments" ON storage.objects;
  DROP POLICY IF EXISTS "Allow authenticated upload for ticket attachments" ON storage.objects;
  DROP POLICY IF EXISTS "Allow authenticated update for ticket attachments" ON storage.objects;
  DROP POLICY IF EXISTS "Allow authenticated delete for ticket attachments" ON storage.objects;
  DROP POLICY IF EXISTS "Allow public read for message attachments" ON storage.objects;
  DROP POLICY IF EXISTS "Allow authenticated upload for message attachments" ON storage.objects;
  DROP POLICY IF EXISTS "Allow authenticated update for message attachments" ON storage.objects;
  DROP POLICY IF EXISTS "Allow authenticated delete for message attachments" ON storage.objects;

  -- Supprimer les buckets existants
  DELETE FROM storage.buckets WHERE id IN ('ticket-attachments', 'message-attachments');
  
  RAISE NOTICE 'Nettoyage terminé';
END $$;

-- Supprimer les fonctions existantes pour éviter les conflits de type
DROP FUNCTION IF EXISTS check_storage_configuration();
DROP FUNCTION IF EXISTS verify_storage_setup();

-- Étape 2: Créer les buckets avec la configuration correcte
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  (
    'ticket-attachments',
    'ticket-attachments',
    true,
    10485760, -- 10MB
    ARRAY[
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain', 'text/csv', 'text/rtf',
      'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed',
      'application/json', 'application/xml'
    ]
  ),
  (
    'message-attachments',
    'message-attachments',
    true,
    10485760, -- 10MB
    ARRAY[
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain', 'text/csv', 'text/rtf',
      'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed',
      'application/json', 'application/xml'
    ]
  );

-- Étape 3: Créer les politiques RLS simplifiées et fonctionnelles

-- Politiques pour ticket-attachments
CREATE POLICY "storage_ticket_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'ticket-attachments');

CREATE POLICY "storage_ticket_upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'ticket-attachments');

CREATE POLICY "storage_ticket_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'ticket-attachments')
WITH CHECK (bucket_id = 'ticket-attachments');

CREATE POLICY "storage_ticket_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'ticket-attachments');

-- Politiques pour message-attachments
CREATE POLICY "storage_message_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'message-attachments');

CREATE POLICY "storage_message_upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'message-attachments');

CREATE POLICY "storage_message_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'message-attachments')
WITH CHECK (bucket_id = 'message-attachments');

CREATE POLICY "storage_message_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'message-attachments');

-- Étape 4: Fonction de vérification robuste
CREATE OR REPLACE FUNCTION verify_storage_setup()
RETURNS TABLE(
  component text,
  status text,
  details text
) AS $$
BEGIN
  -- Vérifier les buckets
  RETURN QUERY
  SELECT 
    ('Bucket: ' || b.name)::text as component,
    (CASE WHEN b.public THEN 'OK' ELSE 'ERROR' END)::text as status,
    ('Public: ' || b.public::text || ', Size limit: ' || COALESCE(b.file_size_limit::text, 'unlimited'))::text as details
  FROM storage.buckets b
  WHERE b.id IN ('ticket-attachments', 'message-attachments')
  ORDER BY b.name;
  
  -- Vérifier les politiques
  RETURN QUERY
  SELECT 
    ('Policies for ' || 
    CASE 
      WHEN policyname LIKE '%ticket%' THEN 'ticket-attachments'
      WHEN policyname LIKE '%message%' THEN 'message-attachments'
      ELSE 'unknown'
    END)::text as component,
    'OK'::text as status,
    (cmd || ' policy: ' || policyname)::text as details
  FROM pg_policies 
  WHERE tablename = 'objects' 
    AND (policyname LIKE '%ticket%' OR policyname LIKE '%message%')
  ORDER BY policyname;
  
  -- Résumé
  RETURN QUERY
  SELECT 
    'Summary'::text as component,
    (CASE 
      WHEN (SELECT COUNT(*) FROM storage.buckets WHERE id IN ('ticket-attachments', 'message-attachments')) = 2
        AND (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'objects' AND (policyname LIKE '%ticket%' OR policyname LIKE '%message%')) >= 8
      THEN 'READY'
      ELSE 'ERROR'
    END)::text as status,
    ('Buckets: ' || (SELECT COUNT(*) FROM storage.buckets WHERE id IN ('ticket-attachments', 'message-attachments'))::text ||
    ', Policies: ' || (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'objects' AND (policyname LIKE '%ticket%' OR policyname LIKE '%message%'))::text)::text as details;
END;
$$ LANGUAGE plpgsql;

-- Étape 5: Fonction pour l'application JavaScript (corrigée)
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
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%' || replace(b.name, '-', '_') || '%') as policies_count
  FROM storage.buckets b
  WHERE b.id IN ('ticket-attachments', 'message-attachments')
  ORDER BY b.name;
END;
$$ LANGUAGE plpgsql;

-- Étape 6: Test automatique
DO $$
DECLARE
  verification_result RECORD;
  error_found BOOLEAN := false;
BEGIN
  RAISE NOTICE '=== VÉRIFICATION DE LA CONFIGURATION STORAGE ===';
  
  FOR verification_result IN SELECT * FROM verify_storage_setup() LOOP
    RAISE NOTICE '% | % | %', verification_result.component, verification_result.status, verification_result.details;
    
    IF verification_result.status = 'ERROR' THEN
      error_found := true;
    END IF;
  END LOOP;
  
  IF error_found THEN
    RAISE EXCEPTION 'Configuration storage incomplète. Vérifiez les erreurs ci-dessus.';
  ELSE
    RAISE NOTICE '✅ Configuration storage complète et fonctionnelle !';
  END IF;
END $$;

-- Afficher le résultat final
SELECT * FROM verify_storage_setup();