-- Add system setting for security notification email if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM system_settings WHERE key = 'security_notification_email') THEN
    INSERT INTO system_settings (key, value, description)
    VALUES ('security_notification_email', '"admin@example.com"'::jsonb, 'Email address to receive security notifications');
  END IF;
END $$;

-- Create or replace function to ensure proper JSON types
CREATE OR REPLACE FUNCTION ensure_proper_json_types()
RETURNS TRIGGER AS $$
BEGIN
  -- For boolean settings, ensure they are stored as JSON booleans, not strings
  IF NEW.key IN (
    'auto_assign_tickets',
    'knowledge_base_public',
    'notifications_enabled',
    'satisfaction_survey_enabled',
    'email_notifications',
    'auto_registration',
    'require_email_verification',
    'require_2fa',
    'audit_logging',
    'smtp_enabled',
    'smtp_secure',
    'malware_scan_enabled',
    'block_malicious_files'
  ) THEN
    -- If it's a string 'true' or 'false', convert to JSON boolean
    IF NEW.value::text = '"true"' THEN
      NEW.value = 'true'::jsonb;
    ELSIF NEW.value::text = '"false"' THEN
      NEW.value = 'false'::jsonb;
    END IF;
  END IF;
  
  -- For email addresses, ensure they are stored as JSON strings
  IF NEW.key IN (
    'security_notification_email',
    'smtp_from_email',
    'support_email'
  ) THEN
    -- If it's not already a JSON string, make it one
    IF NEW.value::text NOT LIKE '"%"' AND NEW.value::text NOT LIKE '{%}' THEN
      NEW.value = to_jsonb(NEW.value::text);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to ensure proper JSON types if it doesn't exist
DROP TRIGGER IF EXISTS ensure_proper_json_types_trigger ON system_settings;
CREATE TRIGGER ensure_proper_json_types_trigger
BEFORE INSERT OR UPDATE ON system_settings
FOR EACH ROW
EXECUTE FUNCTION ensure_proper_json_types();