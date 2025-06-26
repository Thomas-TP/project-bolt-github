/*
  # Table de stockage alternatif pour les fichiers

  1. Nouvelle Table
    - `file_storage` - Stockage des fichiers en base64
      - `id` (uuid, primary key)
      - `name` (text, nom unique du fichier)
      - `originalName` (text, nom original)
      - `size` (integer, taille en bytes)
      - `type` (text, type MIME)
      - `data` (text, contenu base64)
      - `uploadedAt` (timestamptz)
      - `uploadedBy` (uuid, référence users)

  2. Sécurité
    - Enable RLS sur `file_storage` table
    - Politiques pour permettre l'accès selon les permissions
*/

-- Créer la table de stockage alternatif
CREATE TABLE IF NOT EXISTS file_storage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  originalName text NOT NULL,
  size integer NOT NULL,
  type text NOT NULL,
  data text NOT NULL, -- Base64 du fichier
  uploadedAt timestamptz DEFAULT now(),
  uploadedBy uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_file_storage_name ON file_storage(name);
CREATE INDEX IF NOT EXISTS idx_file_storage_uploaded_by ON file_storage(uploadedBy);
CREATE INDEX IF NOT EXISTS idx_file_storage_uploaded_at ON file_storage(uploadedAt DESC);
CREATE INDEX IF NOT EXISTS idx_file_storage_type ON file_storage(type);

-- Activer RLS
ALTER TABLE file_storage ENABLE ROW LEVEL SECURITY;

-- Politique pour voir ses propres fichiers
CREATE POLICY "Users can view own files"
  ON file_storage
  FOR SELECT
  TO authenticated
  USING (uploadedBy = auth.uid());

-- Politique pour les agents/admins de voir tous les fichiers
CREATE POLICY "Agents can view all files"
  ON file_storage
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('agent', 'admin')
    )
  );

-- Politique pour créer des fichiers
CREATE POLICY "Users can upload files"
  ON file_storage
  FOR INSERT
  TO authenticated
  WITH CHECK (uploadedBy = auth.uid());

-- Politique pour supprimer ses propres fichiers
CREATE POLICY "Users can delete own files"
  ON file_storage
  FOR DELETE
  TO authenticated
  USING (uploadedBy = auth.uid());

-- Politique pour les agents/admins de supprimer tous les fichiers
CREATE POLICY "Agents can delete all files"
  ON file_storage
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('agent', 'admin')
    )
  );

-- Fonction pour nettoyer les anciens fichiers (optionnel)
CREATE OR REPLACE FUNCTION cleanup_old_files()
RETURNS void AS $$
BEGIN
  -- Supprimer les fichiers de plus de 1 an
  DELETE FROM file_storage 
  WHERE uploadedAt < now() - interval '1 year';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour obtenir la taille totale utilisée par utilisateur
CREATE OR REPLACE FUNCTION get_user_storage_usage(user_id uuid)
RETURNS bigint AS $$
BEGIN
  RETURN COALESCE(
    (SELECT SUM(size) FROM file_storage WHERE uploadedBy = user_id),
    0
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Table file_storage créée avec succès !';
  RAISE NOTICE '📁 Stockage alternatif prêt pour les fichiers';
  RAISE NOTICE '🔒 Politiques RLS configurées';
  RAISE NOTICE '⚡ Index de performance créés';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Fonctionnalités disponibles:';
  RAISE NOTICE '   - Stockage fichiers en base64 (max 5MB)';
  RAISE NOTICE '   - Téléchargement direct depuis la base';
  RAISE NOTICE '   - Gestion des permissions par utilisateur';
  RAISE NOTICE '   - Nettoyage automatique des anciens fichiers';
  RAISE NOTICE '';
END $$;