/*
  # Promouvoir leolebg1999@gmail.com en admin et ajouter suppression tickets

  1. Mise à jour utilisateur
    - Promouvoir leolebg1999@gmail.com en admin
    - Mettre à jour les informations du profil

  2. Nouvelles fonctionnalités
    - Politique pour supprimer les tickets (admins seulement)
    - Fonction pour supprimer un ticket avec ses dépendances
*/

-- Promouvoir l'utilisateur en admin
UPDATE users 
SET 
  role = 'admin',
  full_name = 'Léo Admin',
  company = 'HelpDesk Pro',
  department = 'Administration',
  updated_at = now()
WHERE email = 'leolebg1999@gmail.com';

-- Ajouter une politique pour permettre aux admins de supprimer les tickets
CREATE POLICY "Admins can delete tickets"
  ON tickets
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Fonction pour supprimer un ticket avec toutes ses dépendances
CREATE OR REPLACE FUNCTION delete_ticket_cascade(ticket_id uuid)
RETURNS boolean AS $$
DECLARE
  current_user_role user_role;
BEGIN
  -- Vérifier que l'utilisateur est admin
  SELECT role INTO current_user_role
  FROM users
  WHERE id = auth.uid();
  
  IF current_user_role != 'admin' THEN
    RAISE EXCEPTION 'Seuls les administrateurs peuvent supprimer des tickets';
  END IF;
  
  -- Supprimer les fichiers associés au ticket
  DELETE FROM file_storage 
  WHERE name LIKE 'ticket_' || ticket_id || '%' 
     OR name LIKE 'message_' || ticket_id || '%';
  
  -- Supprimer les messages du ticket (cascade automatique)
  DELETE FROM messages WHERE ticket_id = delete_ticket_cascade.ticket_id;
  
  -- Supprimer les notifications liées au ticket
  DELETE FROM notifications 
  WHERE action_url LIKE '%/tickets/' || ticket_id || '%';
  
  -- Supprimer le ticket lui-même
  DELETE FROM tickets WHERE id = delete_ticket_cascade.ticket_id;
  
  -- Créer une notification pour l'équipe
  INSERT INTO notifications (user_id, title, message, type)
  SELECT 
    u.id,
    'Ticket supprimé',
    'Un ticket a été supprimé par un administrateur',
    'warning'
  FROM users u 
  WHERE u.role IN ('agent', 'admin') AND u.is_active = true;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Vérifier que la promotion a fonctionné
DO $$
DECLARE
  user_record RECORD;
BEGIN
  SELECT * INTO user_record
  FROM users
  WHERE email = 'leolebg1999@gmail.com';
  
  IF user_record.role = 'admin' THEN
    RAISE NOTICE '✅ Utilisateur leolebg1999@gmail.com promu en admin avec succès !';
    RAISE NOTICE '👤 Nom: %', user_record.full_name;
    RAISE NOTICE '🏢 Entreprise: %', user_record.company;
    RAISE NOTICE '🔧 Département: %', user_record.department;
    RAISE NOTICE '🔑 Rôle: %', user_record.role;
  ELSE
    RAISE NOTICE '❌ Échec de la promotion. Rôle actuel: %', COALESCE(user_record.role::text, 'non trouvé');
  END IF;
END $$;

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🎉 CONFIGURATION ADMIN TERMINÉE !';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Fonctionnalités ajoutées:';
  RAISE NOTICE '   - Compte leolebg1999@gmail.com promu en admin';
  RAISE NOTICE '   - Politique de suppression des tickets';
  RAISE NOTICE '   - Fonction de suppression en cascade';
  RAISE NOTICE '   - Nettoyage automatique des dépendances';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 Prochaines étapes:';
  RAISE NOTICE '   1. Rechargez votre application';
  RAISE NOTICE '   2. Reconnectez-vous pour actualiser vos permissions';
  RAISE NOTICE '   3. Testez la suppression d''un ticket';
  RAISE NOTICE '';
END $$;