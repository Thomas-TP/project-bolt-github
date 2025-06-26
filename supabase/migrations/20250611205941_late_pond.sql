/*
  # Création des buckets de stockage pour les fichiers

  1. Buckets
    - `ticket-attachments` - Pour les fichiers joints aux tickets
    - `message-attachments` - Pour les fichiers joints aux messages
  
  2. Politiques de sécurité
    - Lecture publique pour tous les fichiers
    - Écriture pour les utilisateurs authentifiés
    - Suppression pour les propriétaires et agents/admins
*/

-- Créer le bucket pour les fichiers joints aux tickets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ticket-attachments',
  'ticket-attachments',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'application/zip', 'application/x-rar-compressed']
) ON CONFLICT (id) DO NOTHING;

-- Créer le bucket pour les fichiers joints aux messages
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'message-attachments',
  'message-attachments',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'application/zip', 'application/x-rar-compressed']
) ON CONFLICT (id) DO NOTHING;

-- Politique pour permettre la lecture publique des fichiers de tickets
CREATE POLICY "Public read access for ticket attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'ticket-attachments');

-- Politique pour permettre l'upload de fichiers de tickets aux utilisateurs authentifiés
CREATE POLICY "Authenticated users can upload ticket attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'ticket-attachments');

-- Politique pour permettre la suppression des fichiers de tickets par les agents/admins
CREATE POLICY "Agents can delete ticket attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'ticket-attachments' AND
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('agent', 'admin')
  )
);

-- Politique pour permettre la lecture publique des fichiers de messages
CREATE POLICY "Public read access for message attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'message-attachments');

-- Politique pour permettre l'upload de fichiers de messages aux utilisateurs authentifiés
CREATE POLICY "Authenticated users can upload message attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'message-attachments');

-- Politique pour permettre la suppression des fichiers de messages par les propriétaires et agents/admins
CREATE POLICY "Users can delete own message attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'message-attachments' AND
  (
    -- Le propriétaire du fichier peut le supprimer
    owner = auth.uid() OR
    -- Les agents et admins peuvent supprimer tous les fichiers
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('agent', 'admin')
    )
  )
);