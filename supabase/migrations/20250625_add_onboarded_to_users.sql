-- Ajoute le champ 'onboarded' à la table users pour gérer l'onboarding obligatoire
ALTER TABLE users ADD COLUMN onboarded boolean NOT NULL DEFAULT false;
