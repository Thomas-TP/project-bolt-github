/*
  # Correction définitive des buckets Storage

  1. Création des buckets manquants
  2. Configuration des politiques de sécurité
  3. Fonction de vérification
*/

-- Fonction pour créer les buckets s'ils n'existent pas
DO $$
BEGIN
  -- Créer le bucket ticket-attachments s'il n'existe pas
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'ticket-attachments') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'ticket-attachments',
      'ticket-attachments',
      true,
      10485760, -- 10MB
      ARRAY[
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf', 'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain', 'application/zip', 'application/x-rar-compressed'
      ]
    );
    RAISE NOTICE 'Bucket ticket-attachments créé';
  ELSE
    RAISE NOTICE 'Bucket ticket-attachments existe déjà';
  END IF;

  -- Créer le bucket message-attachments s'il n'existe pas
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'message-attachments') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'message-attachments',
      'message-attachments',
      true,
      10485760, -- 10MB
      ARRAY[
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf', 'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain', 'application/zip', 'application/x-rar-compressed'
      ]
    );
    RAISE NOTICE 'Bucket message-attachments créé';
  ELSE
    RAISE NOTICE 'Bucket message-attachments existe déjà';
  END IF;
END $$;

-- Supprimer les anciennes politiques pour éviter les conflits
DROP POLICY IF EXISTS "Public read access for ticket attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload ticket attachments" ON storage.objects;
DROP POLICY IF EXISTS "Agents can delete ticket attachments" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for message attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload message attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own message attachments" ON storage.objects;
DROP POLICY IF EXISTS "ticket_attachments_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "ticket_attachments_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "ticket_attachments_delete_policy" ON storage.objects;
DROP POLICY IF EXISTS "message_attachments_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "message_attachments_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "message_attachments_delete_policy" ON storage.objects;
DROP POLICY IF EXISTS "ticket_attachments_public_read" ON storage.objects;
DROP POLICY IF EXISTS "ticket_attachments_auth_upload" ON storage.objects;
DROP POLICY IF EXISTS "ticket_attachments_auth_delete" ON storage.objects;
DROP POLICY IF EXISTS "message_attachments_public_read" ON storage.objects;
DROP POLICY IF EXISTS "message_attachments_auth_upload" ON storage.objects;
DROP POLICY IF EXISTS "message_attachments_auth_delete" ON storage.objects;

-- Politiques pour ticket-attachments
CREATE POLICY "ticket_attachments_public_read" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'ticket-attachments');

CREATE POLICY "ticket_attachments_auth_upload" 
ON storage.objects FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'ticket-attachments');

CREATE POLICY "ticket_attachments_auth_delete" 
ON storage.objects FOR DELETE 
TO authenticated
USING (bucket_id = 'ticket-attachments');

-- Politiques pour message-attachments
CREATE POLICY "message_attachments_public_read" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'message-attachments');

CREATE POLICY "message_attachments_auth_upload" 
ON storage.objects FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'message-attachments');

CREATE POLICY "message_attachments_auth_delete" 
ON storage.objects FOR DELETE 
TO authenticated
USING (bucket_id = 'message-attachments');

-- Fonction pour vérifier la configuration des buckets
CREATE OR REPLACE FUNCTION check_storage_configuration()
RETURNS TABLE(
  bucket_name text,
  bucket_found boolean,
  is_public boolean,
  policies_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.name::text,
    true as bucket_found,
    b.public,
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%' || replace(b.name, '-', '_') || '%')
  FROM storage.buckets b
  WHERE b.id IN ('ticket-attachments', 'message-attachments')
  
  UNION ALL
  
  -- Vérifier les buckets manquants
  SELECT 
    bucket_id::text,
    false as bucket_found,
    false as is_public,
    0::bigint as policies_count
  FROM (VALUES ('ticket-attachments'), ('message-attachments')) AS required(bucket_id)
  WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = required.bucket_id);
END;
$$ LANGUAGE plpgsql;

-- Afficher le résultat de la vérification
SELECT * FROM check_storage_configuration();