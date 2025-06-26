/*
  # Table des tickets

  1. Nouvelles Tables
    - `tickets` - Tickets de support
      - `id` (uuid, primary key)
      - `title` (text, required)
      - `description` (text, required)
      - `status` (enum)
      - `priority` (enum)
      - `category` (text)
      - `client_id` (uuid, référence users)
      - `agent_id` (uuid, référence users, optionnel)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `resolved_at` (timestamptz, optionnel)
      - `closed_at` (timestamptz, optionnel)
      - `tags` (text array)
      - `satisfaction_rating` (integer, 1-5)
      - `satisfaction_comment` (text)

  2. Sécurité
    - Enable RLS sur `tickets` table
    - Les clients peuvent voir leurs propres tickets
    - Les agents peuvent voir tous les tickets
*/

-- Créer les types enum pour les tickets
CREATE TYPE ticket_status AS ENUM ('ouvert', 'en_cours', 'en_attente', 'resolu', 'ferme');
CREATE TYPE ticket_priority AS ENUM ('faible', 'normale', 'elevee', 'urgente');

-- Créer la table tickets
CREATE TABLE IF NOT EXISTS tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  status ticket_status DEFAULT 'ouvert',
  priority ticket_priority DEFAULT 'normale',
  category text NOT NULL,
  client_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  closed_at timestamptz,
  tags text[] DEFAULT '{}',
  satisfaction_rating integer CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
  satisfaction_comment text
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_tickets_client_id ON tickets(client_id);
CREATE INDEX IF NOT EXISTS idx_tickets_agent_id ON tickets(agent_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at DESC);

-- Activer RLS
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Politique pour les clients de voir leurs propres tickets
CREATE POLICY "Clients can view own tickets"
  ON tickets
  FOR SELECT
  TO authenticated
  USING (
    client_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('agent', 'admin')
    )
  );

-- Politique pour créer des tickets (clients seulement)
CREATE POLICY "Clients can create tickets"
  ON tickets
  FOR INSERT
  TO authenticated
  WITH CHECK (client_id = auth.uid());

-- Politique pour les agents/admins de modifier tous les tickets
CREATE POLICY "Agents can update tickets"
  ON tickets
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('agent', 'admin')
    )
  );

-- Politique pour les clients de modifier leurs propres tickets (limité)
CREATE POLICY "Clients can update own tickets"
  ON tickets
  FOR UPDATE
  TO authenticated
  USING (
    client_id = auth.uid() AND
    status IN ('ouvert', 'en_attente')
  );

-- Trigger pour updated_at
CREATE TRIGGER update_tickets_updated_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Fonction pour mettre à jour resolved_at quand le statut devient "resolu"
CREATE OR REPLACE FUNCTION update_ticket_resolved_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'resolu' AND OLD.status != 'resolu' THEN
    NEW.resolved_at = now();
  ELSIF NEW.status != 'resolu' THEN
    NEW.resolved_at = NULL;
  END IF;

  IF NEW.status = 'ferme' AND OLD.status != 'ferme' THEN
    NEW.closed_at = now();
  ELSIF NEW.status != 'ferme' THEN
    NEW.closed_at = NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ticket_timestamps
  BEFORE UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_ticket_resolved_at();