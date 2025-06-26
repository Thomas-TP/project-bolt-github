/*
  # Table des messages

  1. Nouvelles Tables
    - `messages` - Messages des tickets
      - `id` (uuid, primary key)
      - `ticket_id` (uuid, référence tickets)
      - `user_id` (uuid, référence users)
      - `content` (text, required)
      - `is_internal` (boolean, pour notes internes agents)
      - `attachments` (jsonb, pour fichiers joints)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Sécurité
    - Enable RLS sur `messages` table
    - Accès basé sur l'accès au ticket parent
*/

-- Créer la table messages
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_internal boolean DEFAULT false,
  attachments jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_messages_ticket_id ON messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- Activer RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Politique pour voir les messages selon l'accès au ticket
CREATE POLICY "Users can view messages of accessible tickets"
  ON messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tickets t
      WHERE t.id = ticket_id AND (
        t.client_id = auth.uid() OR
        t.agent_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM users u
          WHERE u.id = auth.uid() AND u.role IN ('agent', 'admin')
        )
      )
    ) AND (
      NOT is_internal OR
      EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = auth.uid() AND u.role IN ('agent', 'admin')
      )
    )
  );

-- Politique pour créer des messages
CREATE POLICY "Users can create messages on accessible tickets"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM tickets t
      WHERE t.id = ticket_id AND (
        t.client_id = auth.uid() OR
        t.agent_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM users u
          WHERE u.id = auth.uid() AND u.role IN ('agent', 'admin')
        )
      )
    )
  );

-- Politique pour modifier ses propres messages (dans un délai limité)
CREATE POLICY "Users can update own messages"
  ON messages
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() AND
    created_at > now() - interval '15 minutes'
  );

-- Trigger pour updated_at
CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();