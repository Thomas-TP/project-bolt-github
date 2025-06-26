/*
  # Correction de la base de connaissances

  1. Corrections
    - Réinitialiser les vues à 0 pour tous les articles
    - Ajouter une politique de suppression pour les agents/admins
    - Corriger les données fictives

  2. Améliorations
    - Politique de suppression sécurisée
    - Nettoyage des données de test
*/

-- Réinitialiser toutes les vues à 0
UPDATE knowledge_base SET views = 0;

-- Ajouter une politique pour permettre aux agents/admins de supprimer des articles
DROP POLICY IF EXISTS "Agents can delete articles" ON knowledge_base;

CREATE POLICY "Agents can delete articles"
  ON knowledge_base
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() 
      AND users.role IN ('agent', 'admin')
      AND users.is_active = true
    )
  );

-- Mettre à jour les articles existants pour enlever les vues fictives
UPDATE knowledge_base 
SET 
  views = 0,
  updated_at = now()
WHERE views > 0;

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Base de connaissances corrigée !';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 Corrections apportées :';
  RAISE NOTICE '   - Toutes les vues remises à 0';
  RAISE NOTICE '   - Politique de suppression ajoutée pour agents/admins';
  RAISE NOTICE '   - Données fictives nettoyées';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Fonctionnalités maintenant disponibles :';
  RAISE NOTICE '   - Suppression d''articles par agents/admins';
  RAISE NOTICE '   - Compteur de vues réel (pas fictif)';
  RAISE NOTICE '   - Interface de suppression avec confirmation';
  RAISE NOTICE '';
END $$;