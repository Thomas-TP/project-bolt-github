-- Add system setting for security notification email
INSERT INTO system_settings (key, value, description)
VALUES 
  ('security_notification_email', '"admin@example.com"', 'Email address to receive security notifications')
ON CONFLICT (key) DO NOTHING;

-- Create email template for virus detection notifications
INSERT INTO email_templates (name, subject, body, variables, is_active)
VALUES (
  'virus_detection',
  '🚨 ALERTE SÉCURITÉ: Virus détecté dans un fichier',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
    <div style="background-color: #f44336; color: white; padding: 10px; text-align: center; border-radius: 5px 5px 0 0;">
      <h1 style="margin: 0;">🚨 ALERTE DE SÉCURITÉ</h1>
    </div>
    
    <div style="padding: 20px;">
      <p><strong>Un fichier potentiellement malveillant a été détecté dans le système.</strong></p>
      
      <div style="background-color: #fff3cd; border: 1px solid #ffeeba; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <h3 style="margin-top: 0; color: #856404;">Détails de la détection</h3>
        <ul style="padding-left: 20px; margin-bottom: 0;">
          <li><strong>Utilisateur:</strong> {user_name} ({user_email})</li>
          <li><strong>Fichier:</strong> {file_name}</li>
          <li><strong>Type:</strong> {file_type}</li>
          <li><strong>Taille:</strong> {file_size}</li>
          <li><strong>Menaces détectées:</strong> {threats}</li>
          <li><strong>Date de scan:</strong> {scan_date}</li>
          <li><strong>ID de scan:</strong> {scan_id}</li>
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
  </div>',
  '["to_email", "to_name", "subject", "user_name", "user_email", "file_name", "file_type", "file_size", "threats", "scan_date", "scan_id"]'::jsonb,
  true
)
ON CONFLICT (name) DO UPDATE SET
  subject = EXCLUDED.subject,
  body = EXCLUDED.body,
  variables = EXCLUDED.variables,
  is_active = EXCLUDED.is_active;

-- Create function to send virus detection notification
CREATE OR REPLACE FUNCTION notify_virus_detection()
RETURNS TRIGGER AS $$
DECLARE
  v_admin_email text;
  v_email_enabled boolean;
  v_email_id uuid;
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
  
  -- Get user details
  DECLARE
    v_user_name text;
    v_user_email text;
  BEGIN
    SELECT full_name, email INTO v_user_name, v_user_email
    FROM users
    WHERE id = NEW.scanned_by;
    
    -- Send email notification
    v_email_id := send_email(
      'virus_detection',
      v_admin_email,
      jsonb_build_object(
        'to_email', v_admin_email,
        'to_name', 'Administrateur Sécurité',
        'subject', '🚨 ALERTE SÉCURITÉ: Virus détecté',
        'user_name', COALESCE(v_user_name, v_user_email, 'Utilisateur inconnu'),
        'user_email', COALESCE(v_user_email, 'email inconnu'),
        'file_name', NEW.file_name,
        'file_type', COALESCE(NEW.file_type, 'Type inconnu'),
        'file_size', (NEW.file_size / 1024)::text || ' KB',
        'threats', array_to_string(NEW.threats, ', '),
        'scan_date', to_char(NEW.scanned_at, 'DD/MM/YYYY HH24:MI:SS'),
        'scan_id', COALESCE(NEW.scan_id, NEW.id::text),
        'related_to', 'malware_scan',
        'related_id', NEW.id
      )
    );
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't prevent scan result insertion
    RAISE NOTICE 'Error sending virus detection email: %', SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for virus detection notification
DROP TRIGGER IF EXISTS notify_virus_detection_trigger ON malware_scans;
CREATE TRIGGER notify_virus_detection_trigger
AFTER INSERT ON malware_scans
FOR EACH ROW
WHEN (NOT NEW.is_clean)
EXECUTE FUNCTION notify_virus_detection();