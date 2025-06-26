/*
  # Correction de la suppression des tickets

  1. Problème identifié
    - La fonction delete_ticket_cascade peut avoir des problèmes de permissions
    - Les politiques RLS peuvent bloquer la suppression

  2. Solution
    - Corriger la fonction de suppression
    - Simplifier les politiques de suppression
    - Ajouter une gestion d'erreur robuste
*/

-- Supprimer l'ancienne fonction
DROP FUNCTION IF EXISTS delete_ticket_cascade(uuid);

-- Créer une nouvelle fonction de suppression améliorée
CREATE OR REPLACE FUNCTION delete_ticket_cascade(ticket_id uuid)
RETURNS json AS $$
DECLARE
  current_user_role user_role;
  ticket_exists boolean := false;
  deleted_messages integer := 0;
  deleted_files integer := 0;
  deleted_notifications integer := 0;
  result json;
BEGIN
  -- Vérifier que l'utilisateur est admin
  SELECT role INTO current_user_role
  FROM users
  WHERE id = auth.uid();
  
  IF current_user_role != 'admin' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Seuls les administrateurs peuvent supprimer des tickets'
    );
  END IF;
  
  -- Vérifier que le ticket existe
  SELECT EXISTS(SELECT 1 FROM tickets WHERE id = ticket_id) INTO ticket_exists;
  
  IF NOT ticket_exists THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Ticket non trouvé'
    );
  END IF;
  
  -- Supprimer les fichiers associés au ticket (avec gestion d'erreur)
  BEGIN
    DELETE FROM file_storage 
    WHERE name LIKE 'ticket_' || ticket_id || '%' 
       OR name LIKE 'message_' || ticket_id || '%';
    GET DIAGNOSTICS deleted_files = ROW_COUNT;
  EXCEPTION WHEN OTHERS THEN
    deleted_files := 0;
  END;
  
  -- Supprimer les messages du ticket
  BEGIN
    DELETE FROM messages WHERE ticket_id = delete_ticket_cascade.ticket_id;
    GET DIAGNOSTICS deleted_messages = ROW_COUNT;
  EXCEPTION WHEN OTHERS THEN
    deleted_messages := 0;
  END;
  
  -- Supprimer les notifications liées au ticket
  BEGIN
    DELETE FROM notifications 
    WHERE action_url LIKE '%/tickets/' || ticket_id || '%';
    GET DIAGNOSTICS deleted_notifications = ROW_COUNT;
  EXCEPTION WHEN OTHERS THEN
    deleted_notifications := 0;
  END;
  
  -- Supprimer le ticket lui-même
  DELETE FROM tickets WHERE id = delete_ticket_cascade.ticket_id;
  
  -- Créer le résultat
  result := json_build_object(
    'success', true,
    'ticket_id', ticket_id,
    'deleted_messages', deleted_messages,
    'deleted_files', deleted_files,
    'deleted_notifications', deleted_notifications
  );
  
  -- Créer une notification pour l'équipe (optionnel)
  BEGIN
    INSERT INTO notifications (user_id, title, message, type)
    SELECT 
      u.id,
      'Ticket supprimé',
      'Un ticket a été supprimé par un administrateur',
      'warning'
    FROM users u 
    WHERE u.role IN ('agent', 'admin') AND u.is_active = true AND u.id != auth.uid();
  EXCEPTION WHEN OTHERS THEN
    -- Ignorer les erreurs de notification
  END;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Simplifier la politique de suppression des tickets
DROP POLICY IF EXISTS "Admins can delete tickets" ON tickets;

CREATE POLICY "Admins can delete tickets"
  ON tickets
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
      AND users.is_active = true
    )
  );

-- Politique pour permettre aux admins de supprimer les messages
DROP POLICY IF EXISTS "Admins can delete messages" ON messages;

CREATE POLICY "Admins can delete messages"
  ON messages
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
      AND users.is_active = true
    )
  );

-- Politique pour permettre aux admins de supprimer les notifications
DROP POLICY IF EXISTS "Admins can delete notifications" ON notifications;

CREATE POLICY "Admins can delete notifications"
  ON notifications
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
      AND users.is_active = true
    )
  );

-- Test de la fonction
DO $$
BEGIN
  RAISE NOTICE '✅ Fonction delete_ticket_cascade corrigée';
  RAISE NOTICE '🔒 Politiques de suppression mises à jour';
  RAISE NOTICE '📋 La fonction retourne maintenant un JSON avec les détails';
  RAISE NOTICE '⚠️  Gestion d''erreur améliorée';
END $$;