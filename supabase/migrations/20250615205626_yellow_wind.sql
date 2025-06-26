/*
  # Suppression du template virus et configuration des emails directs

  1. Modifications
    - Suppression du champ de template virus dans les paramètres
    - Configuration pour envoyer les emails de sécurité directement sans template
    - Mise à jour de la fonction de notification de virus

  2. Sécurité
    - Maintien de la notification par email pour les alertes de sécurité
    - Simplification du processus d'envoi d'email
*/

-- Supprimer le paramètre de template virus s'il existe
DELETE FROM system_settings 
WHERE key = 'emailjs_virus_notification_template_id';

-- Mettre à jour la fonction de notification de virus pour envoyer directement l'email
CREATE OR REPLACE FUNCTION notify_virus_detection()
RETURNS TRIGGER AS $$
DECLARE
  v_admin_email text;
  v_email_enabled boolean;
  v_email_id uuid;
  v_email_service_id text;
  v_email_user_id text;
BEGIN
  -- Only proceed if a virus was detected
  IF NEW.is_clean THEN
    RETURN NEW;
  END IF;
  
  -- Check if email notifications are enabled
  SELECT 
    CASE 
      WHEN value::text = 'true' THEN true
      WHEN value::text = '"true"' THEN true
      ELSE false
    END INTO v_email_enabled
  FROM system_settings
  WHERE key = 'email_notifications';
  
  IF NOT v_email_enabled THEN
    RETURN NEW;
  END IF;
  
  -- Get admin email from settings
  SELECT value::text INTO v_admin_email
  FROM system_settings
  WHERE key = 'security_notification_email';
  
  -- Remove quotes if present
  v_admin_email := replace(replace(v_admin_email, '"', ''), '''', '');
  
  -- If no admin email is set, use a default
  IF v_admin_email IS NULL OR v_admin_email = '' THEN
    v_admin_email := 'admin@example.com';
  END IF;
  
  -- Get EmailJS configuration
  SELECT value::text INTO v_email_service_id
  FROM system_settings
  WHERE key = 'emailjs_service_id';
  
  SELECT value::text INTO v_email_user_id
  FROM system_settings
  WHERE key = 'emailjs_user_id';
  
  -- Remove quotes if present
  v_email_service_id := replace(replace(v_email_service_id, '"', ''), '''', '');
  v_email_user_id := replace(replace(v_email_user_id, '"', ''), '''', '');
  
  -- Get user details
  DECLARE
    v_user_name text;
    v_user_email text;
    v_email_subject text;
    v_email_body text;
  BEGIN
    SELECT full_name, email INTO v_user_name, v_user_email
    FROM users
    WHERE id = NEW.scanned_by;
    
    -- Create email subject and body directly
    v_email_subject := '🚨 ALERTE SÉCURITÉ: Virus détecté dans un fichier';
    
    v_email_body := '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <div style="background-color: #f44336; color: white; padding: 10px; text-align: center; border-radius: 5px 5px 0 0;">
        <h1 style="margin: 0;">🚨 ALERTE DE SÉCURITÉ</h1>
      </div>
      
      <div style="padding: 20px;">
        <p><strong>Un fichier potentiellement malveillant a été détecté dans le système.</strong></p>
        
        <div style="background-color: #fff3cd; border: 1px solid #ffeeba; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <h3 style="margin-top: 0; color: #856404;">Détails de la détection</h3>
          <ul style="padding-left: 20px; margin-bottom: 0;">
            <li><strong>Utilisateur:</strong> ' || COALESCE(v_user_name, v_user_email, 'Utilisateur inconnu') || ' (' || COALESCE(v_user_email, 'email inconnu') || ')</li>
            <li><strong>Fichier:</strong> ' || NEW.file_name || '</li>
            <li><strong>Type:</strong> ' || COALESCE(NEW.file_type, 'Type inconnu') || '</li>
            <li><strong>Taille:</strong> ' || (NEW.file_size / 1024)::text || ' KB</li>
            <li><strong>Menaces détectées:</strong> ' || array_to_string(NEW.threats, ', ') || '</li>
            <li><strong>Date de scan:</strong> ' || to_char(NEW.scanned_at, 'DD/MM/YYYY HH24:MI:SS') || '</li>
            <li><strong>ID de scan:</strong> ' || COALESCE(NEW.scan_id, NEW.id::text) || '</li>
          </ul>
        </div>
        
        <p>Le fichier a été automatiquement bloqué et n''a pas été enregistré dans le système.</p>
        
        <p>Veuillez contacter l''utilisateur pour l''informer de cette détection et lui demander de vérifier son système pour d''éventuelles infections.</p>
        
        <div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <h3 style="margin-top: 0; color: #155724;">Actions recommandées</h3>
          <ol style="padding-left: 20px; margin-bottom: 0;">
            <li>Vérifier les journaux d''audit pour d''autres activités suspectes</li>
            <li>Contacter l''utilisateur pour l''informer de la situation</li>
            <li>Recommander une analyse antivirus complète de son système</li>
            <li>Vérifier si d''autres fichiers suspects ont été téléchargés récemment</li>
          </ol>
        </div>
        
        <p style="margin-top: 30px; font-size: 12px; color: #6c757d; text-align: center;">
          Ce message a été généré automatiquement par le système de sécurité HelpDesk.
          <br>Ne pas répondre à cet email.
        </p>
      </div>
    </div>';
    
    -- Log the email
    INSERT INTO email_logs (
      template_id, 
      recipient, 
      subject, 
      body, 
      status, 
      related_to, 
      related_id
    )
    VALUES (
      NULL, -- No template used
      v_admin_email,
      v_email_subject,
      v_email_body,
      'queued',
      'malware_scan',
      NEW.id
    )
    RETURNING id INTO v_email_id;
    
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't prevent scan result insertion
    RAISE NOTICE 'Error sending virus detection email: %', SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recréer le trigger pour la notification de virus
DROP TRIGGER IF EXISTS notify_virus_detection_trigger ON malware_scans;
CREATE TRIGGER notify_virus_detection_trigger
AFTER INSERT ON malware_scans
FOR EACH ROW
WHEN (NOT NEW.is_clean)
EXECUTE FUNCTION notify_virus_detection();

-- Mettre à jour les paramètres système pour la notification de sécurité
UPDATE system_settings
SET description = 'Email pour recevoir les alertes de sécurité (sans template)'
WHERE key = 'security_notification_email';