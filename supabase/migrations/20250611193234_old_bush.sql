/*
  # Configuration de l'utilisateur agent et données initiales

  1. Mise à jour de l'utilisateur
    - Promouvoir leolebg1999@gmail.com en agent
    - Ajouter des informations complètes

  2. Données initiales
    - Catégories de tickets
    - Articles de base de connaissances
    - Paramètres système

  3. Fonctions utilitaires
    - Fonction pour incrémenter les vues d'articles
    - Fonction pour les notifications en temps réel
*/

-- Promouvoir l'utilisateur en agent (sera exécuté après la première connexion)
-- Cette requête sera sûre même si l'utilisateur n'existe pas encore
UPDATE users 
SET 
  role = 'agent',
  full_name = 'Léo Agent',
  company = 'HelpDesk Pro',
  department = 'Support Technique',
  updated_at = now()
WHERE email = 'leolebg1999@gmail.com';

-- Insérer des catégories par défaut
INSERT INTO categories (name, description, color, icon, sort_order) VALUES
  ('Technique', 'Problèmes techniques et informatiques', '#EF4444', 'Wrench', 1),
  ('Réseau', 'Problèmes de connectivité et réseau', '#3B82F6', 'Wifi', 2),
  ('Logiciel', 'Applications et logiciels', '#8B5CF6', 'Monitor', 3),
  ('Matériel', 'Équipements et hardware', '#F59E0B', 'HardDrive', 4),
  ('Accès', 'Comptes et permissions', '#10B981', 'Key', 5),
  ('Formation', 'Demandes de formation', '#6366F1', 'GraduationCap', 6)
ON CONFLICT (name) DO NOTHING;

-- Insérer des articles de base de connaissances
INSERT INTO knowledge_base (title, content, category, tags, author_id, is_published, is_featured, views) VALUES
  (
    'Comment créer un ticket de support',
    E'# Comment créer un ticket de support\n\n## Étapes pour créer un ticket\n\n1. **Connectez-vous** à la plateforme HelpDesk Pro\n2. **Cliquez** sur "Nouveau Ticket" dans le tableau de bord\n3. **Remplissez** les informations requises :\n   - Titre descriptif\n   - Catégorie appropriée\n   - Niveau de priorité\n   - Description détaillée\n\n## Conseils pour un ticket efficace\n\n- **Soyez précis** dans votre titre\n- **Décrivez** les étapes pour reproduire le problème\n- **Incluez** les messages d\'erreur exacts\n- **Précisez** votre environnement (OS, navigateur, etc.)\n\n## Niveaux de priorité\n\n- **Urgente** : Système en panne, impact critique\n- **Élevée** : Problème important mais contournable\n- **Normale** : Problème standard\n- **Faible** : Amélioration ou question',
    'Formation',
    ARRAY['ticket', 'création', 'guide', 'support'],
    (SELECT id FROM users WHERE email = 'leolebg1999@gmail.com' LIMIT 1),
    true,
    true,
    45
  ),
  (
    'Résolution des problèmes de connexion VPN',
    E'# Résolution des problèmes de connexion VPN\n\n## Problèmes courants\n\n### 1. Impossible de se connecter\n\n**Vérifications :**\n- Connexion internet active\n- Identifiants corrects\n- Serveur VPN disponible\n\n**Solutions :**\n1. Redémarrer l\'application VPN\n2. Changer de serveur\n3. Vérifier les paramètres firewall\n\n### 2. Connexion lente\n\n**Causes possibles :**\n- Surcharge du serveur\n- Distance géographique\n- Limitation de bande passante\n\n**Solutions :**\n1. Choisir un serveur plus proche\n2. Changer de protocole (OpenVPN, IKEv2)\n3. Désactiver temporairement l\'antivirus\n\n### 3. Déconnexions fréquentes\n\n**Solutions :**\n1. Activer la reconnexion automatique\n2. Changer de protocole\n3. Mettre à jour l\'application VPN\n\n## Contact support\n\nSi le problème persiste, créez un ticket avec :\n- Version de l\'application VPN\n- Système d\'exploitation\n- Messages d\'erreur exacts\n- Heure des tentatives de connexion',
    'Réseau',
    ARRAY['vpn', 'connexion', 'réseau', 'troubleshooting'],
    (SELECT id FROM users WHERE email = 'leolebg1999@gmail.com' LIMIT 1),
    true,
    true,
    78
  ),
  (
    'Gestion des mots de passe et sécurité',
    E'# Gestion des mots de passe et sécurité\n\n## Bonnes pratiques\n\n### Création d\'un mot de passe fort\n\n**Critères :**\n- Minimum 12 caractères\n- Mélange de majuscules, minuscules, chiffres et symboles\n- Pas d\'informations personnelles\n- Unique pour chaque compte\n\n**Exemple de structure :**\n`MonPhrase2024!Secure`\n\n### Gestionnaire de mots de passe\n\n**Avantages :**\n- Génération automatique de mots de passe forts\n- Stockage sécurisé\n- Synchronisation entre appareils\n- Détection de mots de passe compromis\n\n**Solutions recommandées :**\n- Bitwarden (gratuit/payant)\n- 1Password (payant)\n- LastPass (freemium)\n\n### Authentification à deux facteurs (2FA)\n\n**Activation recommandée sur :**\n- Comptes email\n- Réseaux sociaux\n- Services bancaires\n- Comptes professionnels\n\n**Applications 2FA :**\n- Google Authenticator\n- Microsoft Authenticator\n- Authy\n\n## En cas de compromission\n\n1. **Changez immédiatement** le mot de passe\n2. **Activez la 2FA** si pas déjà fait\n3. **Vérifiez** les connexions récentes\n4. **Contactez** le support si nécessaire',
    'Accès',
    ARRAY['sécurité', 'mot de passe', '2FA', 'authentification'],
    (SELECT id FROM users WHERE email = 'leolebg1999@gmail.com' LIMIT 1),
    true,
    false,
    92
  );

-- Insérer des paramètres système par défaut
INSERT INTO system_settings (key, value, description, updated_by) VALUES
  ('notifications_enabled', 'true', 'Activer les notifications en temps réel', (SELECT id FROM users WHERE email = 'leolebg1999@gmail.com' LIMIT 1)),
  ('auto_assign_tickets', 'false', 'Assignation automatique des tickets aux agents', (SELECT id FROM users WHERE email = 'leolebg1999@gmail.com' LIMIT 1)),
  ('max_ticket_response_time', '24', 'Temps de réponse maximum en heures', (SELECT id FROM users WHERE email = 'leolebg1999@gmail.com' LIMIT 1)),
  ('knowledge_base_public', 'true', 'Base de connaissances accessible au public', (SELECT id FROM users WHERE email = 'leolebg1999@gmail.com' LIMIT 1)),
  ('satisfaction_survey_enabled', 'true', 'Enquête de satisfaction automatique', (SELECT id FROM users WHERE email = 'leolebg1999@gmail.com' LIMIT 1))
ON CONFLICT (key) DO NOTHING;

-- Fonction pour incrémenter les vues d'articles
CREATE OR REPLACE FUNCTION increment_article_views(article_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE knowledge_base 
  SET views = views + 1 
  WHERE id = article_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour obtenir les statistiques des tickets
CREATE OR REPLACE FUNCTION get_ticket_stats(user_id uuid DEFAULT NULL, user_role text DEFAULT NULL)
RETURNS TABLE(
  total_tickets bigint,
  open_tickets bigint,
  in_progress_tickets bigint,
  pending_tickets bigint,
  resolved_tickets bigint,
  closed_tickets bigint,
  urgent_tickets bigint,
  avg_resolution_time interval
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_tickets,
    COUNT(*) FILTER (WHERE status = 'ouvert') as open_tickets,
    COUNT(*) FILTER (WHERE status = 'en_cours') as in_progress_tickets,
    COUNT(*) FILTER (WHERE status = 'en_attente') as pending_tickets,
    COUNT(*) FILTER (WHERE status = 'resolu') as resolved_tickets,
    COUNT(*) FILTER (WHERE status = 'ferme') as closed_tickets,
    COUNT(*) FILTER (WHERE priority = 'urgente') as urgent_tickets,
    AVG(resolved_at - created_at) FILTER (WHERE resolved_at IS NOT NULL) as avg_resolution_time
  FROM tickets t
  WHERE 
    CASE 
      WHEN user_role = 'client' THEN t.client_id = user_id
      WHEN user_role = 'agent' THEN t.agent_id = user_id
      ELSE true -- admin voit tout
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Table pour les notifications
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info', -- info, success, warning, error
  is_read boolean DEFAULT false,
  action_url text,
  created_at timestamptz DEFAULT now()
);

-- Index pour les notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;

-- RLS pour les notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Fonction pour créer une notification
CREATE OR REPLACE FUNCTION create_notification(
  target_user_id uuid,
  notification_title text,
  notification_message text,
  notification_type text DEFAULT 'info',
  notification_action_url text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  notification_id uuid;
BEGIN
  INSERT INTO notifications (user_id, title, message, type, action_url)
  VALUES (target_user_id, notification_title, notification_message, notification_type, notification_action_url)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour créer des notifications automatiques
CREATE OR REPLACE FUNCTION notify_ticket_events()
RETURNS trigger AS $$
BEGIN
  -- Nouveau ticket créé
  IF TG_OP = 'INSERT' THEN
    -- Notifier tous les agents
    INSERT INTO notifications (user_id, title, message, type, action_url)
    SELECT 
      u.id,
      'Nouveau ticket créé',
      'Un nouveau ticket "' || NEW.title || '" a été créé',
      'info',
      '/tickets/' || NEW.id
    FROM users u 
    WHERE u.role IN ('agent', 'admin') AND u.is_active = true;
    
    RETURN NEW;
  END IF;
  
  -- Ticket mis à jour
  IF TG_OP = 'UPDATE' THEN
    -- Si le statut a changé
    IF OLD.status != NEW.status THEN
      -- Notifier le client
      PERFORM create_notification(
        NEW.client_id,
        'Statut de ticket mis à jour',
        'Votre ticket "' || NEW.title || '" est maintenant ' || NEW.status,
        'info',
        '/tickets/' || NEW.id
      );
    END IF;
    
    -- Si un agent a été assigné
    IF OLD.agent_id IS NULL AND NEW.agent_id IS NOT NULL THEN
      -- Notifier le client
      PERFORM create_notification(
        NEW.client_id,
        'Ticket assigné',
        'Votre ticket "' || NEW.title || '" a été assigné à un agent',
        'success',
        '/tickets/' || NEW.id
      );
      
      -- Notifier l'agent
      PERFORM create_notification(
        NEW.agent_id,
        'Nouveau ticket assigné',
        'Le ticket "' || NEW.title || '" vous a été assigné',
        'info',
        '/tickets/' || NEW.id
      );
    END IF;
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le trigger
DROP TRIGGER IF EXISTS ticket_notification_trigger ON tickets;
CREATE TRIGGER ticket_notification_trigger
  AFTER INSERT OR UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION notify_ticket_events();

-- Trigger pour les nouveaux messages
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS trigger AS $$
DECLARE
  ticket_record tickets%ROWTYPE;
  message_author users%ROWTYPE;
BEGIN
  -- Récupérer les infos du ticket
  SELECT * INTO ticket_record FROM tickets WHERE id = NEW.ticket_id;
  
  -- Récupérer les infos de l'auteur du message
  SELECT * INTO message_author FROM users WHERE id = NEW.user_id;
  
  -- Si c'est un message interne, notifier seulement les agents
  IF NEW.is_internal THEN
    INSERT INTO notifications (user_id, title, message, type, action_url)
    SELECT 
      u.id,
      'Nouveau message interne',
      message_author.full_name || ' a ajouté un message interne au ticket "' || ticket_record.title || '"',
      'info',
      '/tickets/' || ticket_record.id
    FROM users u 
    WHERE u.role IN ('agent', 'admin') 
      AND u.is_active = true 
      AND u.id != NEW.user_id; -- Ne pas notifier l'auteur
  ELSE
    -- Message public : notifier le client et l'agent assigné
    IF ticket_record.client_id != NEW.user_id THEN
      PERFORM create_notification(
        ticket_record.client_id,
        'Nouvelle réponse à votre ticket',
        'Une nouvelle réponse a été ajoutée à votre ticket "' || ticket_record.title || '"',
        'info',
        '/tickets/' || ticket_record.id
      );
    END IF;
    
    IF ticket_record.agent_id IS NOT NULL AND ticket_record.agent_id != NEW.user_id THEN
      PERFORM create_notification(
        ticket_record.agent_id,
        'Nouveau message client',
        'Le client a répondu au ticket "' || ticket_record.title || '"',
        'info',
        '/tickets/' || ticket_record.id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le trigger pour les messages
DROP TRIGGER IF EXISTS message_notification_trigger ON messages;
CREATE TRIGGER message_notification_trigger
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION notify_new_message();