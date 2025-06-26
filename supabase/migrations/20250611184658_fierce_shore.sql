/*
  # Table de la base de connaissances

  1. Nouvelles Tables
    - `knowledge_base` - Articles de la base de connaissances
      - `id` (uuid, primary key)
      - `title` (text, required)
      - `content` (text, required)
      - `category` (text)
      - `tags` (text array)
      - `author_id` (uuid, référence users)
      - `views` (integer, défaut 0)
      - `is_published` (boolean, défaut false)
      - `is_featured` (boolean, défaut false)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `published_at` (timestamptz)

  2. Sécurité
    - Enable RLS sur `knowledge_base` table
    - Tous peuvent voir les articles publiés
    - Seuls agents/admins peuvent créer/modifier
*/

-- Créer la table knowledge_base
CREATE TABLE IF NOT EXISTS knowledge_base (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  category text,
  tags text[] DEFAULT '{}',
  author_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  views integer DEFAULT 0,
  is_published boolean DEFAULT false,
  is_featured boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  published_at timestamptz
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_knowledge_base_category ON knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_published ON knowledge_base(is_published);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_featured ON knowledge_base(is_featured);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_views ON knowledge_base(views DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_tags ON knowledge_base USING GIN(tags);

-- Index de recherche full-text
CREATE INDEX IF NOT EXISTS idx_knowledge_base_search 
ON knowledge_base USING gin(to_tsvector('french', title || ' ' || content));

-- Activer RLS
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;

-- Politique pour voir les articles publiés (tous les utilisateurs)
CREATE POLICY "Anyone can view published articles"
  ON knowledge_base
  FOR SELECT
  TO authenticated
  USING (is_published = true);

-- Politique pour les agents/admins de voir tous les articles
CREATE POLICY "Agents can view all articles"
  ON knowledge_base
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('agent', 'admin')
    )
  );

-- Politique pour les agents/admins de créer des articles
CREATE POLICY "Agents can create articles"
  ON knowledge_base
  FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('agent', 'admin')
    )
  );

-- Politique pour les agents/admins de modifier des articles
CREATE POLICY "Agents can update articles"
  ON knowledge_base
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('agent', 'admin')
    )
  );

-- Trigger pour updated_at
CREATE TRIGGER update_knowledge_base_updated_at
  BEFORE UPDATE ON knowledge_base
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Fonction pour mettre à jour published_at quand is_published devient true
CREATE OR REPLACE FUNCTION update_published_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_published = true AND OLD.is_published = false THEN
    NEW.published_at = now();
  ELSIF NEW.is_published = false THEN
    NEW.published_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_knowledge_base_published_at
  BEFORE UPDATE ON knowledge_base
  FOR EACH ROW
  EXECUTE FUNCTION update_published_at();

-- Fonction pour incrémenter les vues
CREATE OR REPLACE FUNCTION increment_article_views(article_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE knowledge_base 
  SET views = views + 1 
  WHERE id = article_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;