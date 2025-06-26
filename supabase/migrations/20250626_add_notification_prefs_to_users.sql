-- Migration: Ajout de la colonne notification_prefs à la table users
ALTER TABLE users
ADD COLUMN notification_prefs jsonb DEFAULT '{}'::jsonb;

-- (Optionnel) Ajouter un commentaire pour la documentation
COMMENT ON COLUMN users.notification_prefs IS 'Préférences de notifications personnalisées par utilisateur (JSON)';
