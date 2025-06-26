/*
  # Categories et paramètres système

  1. Nouvelles Tables
    - `categories` - Catégories de tickets
    - `system_settings` - Paramètres système

  2. Données initiales
    - Catégories par défaut
    - Paramètres système de base
*/

-- Créer la table categories
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  color text DEFAULT '#3B82F6',
  icon text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Créer la table system_settings
CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL,
  description text,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES users(id)
);

-- Activer RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Politiques pour categories (lecture pour tous, modification pour agents/admins)
CREATE POLICY "Anyone can view active categories"
  ON categories
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Agents can manage categories"
  ON categories
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('agent', 'admin')
    )
  );

-- Politiques pour system_settings (seuls les admins)
CREATE POLICY "Admins can manage settings"
  ON system_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Insérer les catégories par défaut
INSERT INTO categories (name, description, color, icon) VALUES
  ('Technique', 'Problèmes techniques et informatiques', '#EF4444', 'Settings'),
  ('Logiciel', 'Questions sur les logiciels et applications', '#3B82F6', 'Monitor'),
  ('Réseau', 'Problèmes de réseau et connectivité', '#10B981', 'Wifi'),
  ('Matériel', 'Problèmes de matériel informatique', '#F59E0B', 'HardDrive'),
  ('Compte', 'Gestion des comptes utilisateurs', '#8B5CF6', 'User'),
  ('Formation', 'Demandes de formation et documentation', '#06B6D4', 'BookOpen'),
  ('Autre', 'Autres demandes non classifiées', '#6B7280', 'HelpCircle')
ON CONFLICT (name) DO NOTHING;

-- Insérer les paramètres système par défaut
INSERT INTO system_settings (key, value, description) VALUES
  ('site_name', '"HelpDesk Pro"', 'Nom du site'),
  ('support_email', '"support@helpdesk-pro.com"', 'Email de support'),
  ('auto_assign_tickets', 'false', 'Attribution automatique des tickets'),
  ('email_notifications', 'true', 'Notifications par email activées'),
  ('ticket_rating_enabled', 'true', 'Système de notation des tickets activé'),
  ('max_attachments_size', '10485760', 'Taille maximale des pièces jointes (10MB)'),
  ('supported_file_types', '["pdf", "doc", "docx", "txt", "png", "jpg", "jpeg", "gif"]', 'Types de fichiers supportés'),
  ('business_hours', '{"start": "09:00", "end": "18:00", "timezone": "Europe/Paris", "days": ["monday", "tuesday", "wednesday", "thursday", "friday"]}', 'Heures d''ouverture')
ON CONFLICT (key) DO NOTHING;