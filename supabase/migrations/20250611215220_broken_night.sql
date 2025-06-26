/*
  # Correction du schéma de la table file_storage

  1. Problème identifié
    - La colonne 'originalName' n'existe pas dans la table file_storage
    - L'application essaie d'insérer dans une colonne inexistante

  2. Solution
    - Ajouter la colonne 'originalName' manquante
    - Corriger le schéma pour correspondre au code TypeScript
    - Mettre à jour les données existantes si nécessaire
*/

-- Vérifier si la table existe et ajouter les colonnes manquantes
DO $$
BEGIN
  -- Ajouter la colonne originalName si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'file_storage' AND column_name = 'originalname'
  ) THEN
    ALTER TABLE file_storage ADD COLUMN originalname text NOT NULL DEFAULT '';
    RAISE NOTICE 'Colonne originalname ajoutée';
  END IF;

  -- Renommer la colonne si elle a le mauvais nom
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'file_storage' AND column_name = 'originalname'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'file_storage' AND column_name = 'originalName'
  ) THEN
    ALTER TABLE file_storage RENAME COLUMN originalname TO "originalName";
    RAISE NOTICE 'Colonne renommée vers originalName';
  END IF;

  -- Ajouter directement la colonne avec le bon nom si nécessaire
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'file_storage' AND column_name = 'originalName'
  ) THEN
    ALTER TABLE file_storage ADD COLUMN "originalName" text NOT NULL DEFAULT '';
    RAISE NOTICE 'Colonne originalName ajoutée directement';
  END IF;

  -- Vérifier et corriger les autres colonnes si nécessaire
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'file_storage' AND column_name = 'uploadedAt'
  ) THEN
    ALTER TABLE file_storage RENAME COLUMN uploadedat TO "uploadedAt";
    RAISE NOTICE 'Colonne uploadedAt corrigée';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'file_storage' AND column_name = 'uploadedBy'
  ) THEN
    ALTER TABLE file_storage RENAME COLUMN uploadedby TO "uploadedBy";
    RAISE NOTICE 'Colonne uploadedBy corrigée';
  END IF;

END $$;

-- Mettre à jour les données existantes si originalName est vide
UPDATE file_storage 
SET "originalName" = name 
WHERE "originalName" = '' OR "originalName" IS NULL;

-- Fonction pour vérifier le schéma
CREATE OR REPLACE FUNCTION check_file_storage_schema()
RETURNS TABLE(
  column_name text,
  data_type text,
  is_nullable text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.column_name::text,
    c.data_type::text,
    c.is_nullable::text
  FROM information_schema.columns c
  WHERE c.table_name = 'file_storage'
  ORDER BY c.ordinal_position;
END;
$$ LANGUAGE plpgsql;

-- Afficher le schéma corrigé
DO $$
DECLARE
  schema_record RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== SCHÉMA DE LA TABLE file_storage ===';
  RAISE NOTICE '';
  
  FOR schema_record IN SELECT * FROM check_file_storage_schema() LOOP
    RAISE NOTICE '% | % | %', 
      schema_record.column_name, 
      schema_record.data_type, 
      schema_record.is_nullable;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Schéma corrigé et prêt pour l''application !';
  RAISE NOTICE '';
END $$;