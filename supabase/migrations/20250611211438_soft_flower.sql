/*
  # Correction définitive des buckets Storage

  1. Suppression propre des anciennes politiques et buckets
  2. Recréation des buckets avec configuration complète
  3. Politiques de sécurité appropriées
  4. Fonction de test pour vérifier la configuration
*/

-- Supprimer toutes les politiques existantes pour éviter les conflits
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

-- Supprimer les buckets existants s'ils existent
DELETE FROM storage.buckets WHERE id IN ('ticket-attachments', 'message-attachments');

-- Recréer les buckets avec la configuration correcte
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  (
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
      'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed'
    ]
  ),
  (
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
      'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed'
    ]
  );

-- Politiques pour ticket-attachments
CREATE POLICY "ticket_attachments_select_policy" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'ticket-attachments');

CREATE POLICY "ticket_attachments_insert_policy" 
ON storage.objects FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'ticket-attachments');

CREATE POLICY "ticket_attachments_update_policy" 
ON storage.objects FOR UPDATE 
TO authenticated
USING (bucket_id = 'ticket-attachments')
WITH CHECK (bucket_id = 'ticket-attachments');

CREATE POLICY "ticket_attachments_delete_policy" 
ON storage.objects FOR DELETE 
TO authenticated
USING (
  bucket_id = 'ticket-attachments' AND
  (
    owner = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('agent', 'admin')
    )
  )
);

-- Politiques pour message-attachments
CREATE POLICY "message_attachments_select_policy" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'message-attachments');

CREATE POLICY "message_attachments_insert_policy" 
ON storage.objects FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'message-attachments');

CREATE POLICY "message_attachments_update_policy" 
ON storage.objects FOR UPDATE 
TO authenticated
USING (bucket_id = 'message-attachments')
WITH CHECK (bucket_id = 'message-attachments');

CREATE POLICY "message_attachments_delete_policy" 
ON storage.objects FOR DELETE 
TO authenticated
USING (
  bucket_id = 'message-attachments' AND
  (
    owner = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('agent', 'admin')
    )
  )
);

-- Fonction pour tester les buckets (corrigée)
CREATE OR REPLACE FUNCTION test_storage_buckets()
RETURNS TABLE(bucket_name text, bucket_exists boolean, is_public boolean, policies_count bigint)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.name as bucket_name,
    true as bucket_exists,
    b.public as is_public,
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%' || b.name || '%') as policies_count
  FROM storage.buckets b
  WHERE b.id IN ('ticket-attachments', 'message-attachments')
  ORDER BY b.name;
END;
$$;

-- Tester la configuration
SELECT * FROM test_storage_buckets();