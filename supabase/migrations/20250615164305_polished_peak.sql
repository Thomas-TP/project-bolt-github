/*
  # Fix JSONB Boolean Casting Issue

  1. Problem
    - System settings are stored as JSON strings instead of proper boolean values
    - This causes "cannot cast jsonb string to type boolean" errors
    - Affects ticket creation and other functionality

  2. Solution
    - Update all boolean system settings to use proper JSON boolean values
    - Fix the data type of existing records
    - Ensure future inserts use the correct format
*/

-- Update all boolean settings to use proper JSON boolean values instead of strings
UPDATE system_settings
SET value = 'true'::jsonb
WHERE key IN (
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
  'smtp_secure'
) 
AND value = '"true"'::jsonb;

UPDATE system_settings
SET value = 'false'::jsonb
WHERE key IN (
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
  'smtp_secure'
) 
AND value = '"false"'::jsonb;

-- Create or replace function to ensure proper boolean handling in system settings
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
    'smtp_secure'
  ) THEN
    -- If it's a string 'true' or 'false', convert to JSON boolean
    IF NEW.value::text = '"true"' THEN
      NEW.value = 'true'::jsonb;
    ELSIF NEW.value::text = '"false"' THEN
      NEW.value = 'false'::jsonb;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to ensure proper JSON types
DROP TRIGGER IF EXISTS ensure_proper_json_types_trigger ON system_settings;
CREATE TRIGGER ensure_proper_json_types_trigger
BEFORE INSERT OR UPDATE ON system_settings
FOR EACH ROW
EXECUTE FUNCTION ensure_proper_json_types();

-- Fix the send_email function to handle boolean settings correctly
CREATE OR REPLACE FUNCTION send_email(
  p_template_name text,
  p_recipient text,
  p_variables jsonb
) RETURNS uuid AS $$
DECLARE
  v_template_id uuid;
  v_subject text;
  v_body text;
  v_log_id uuid;
  v_var_key text;
  v_var_value text;
  v_email_enabled boolean;
BEGIN
  -- Check if email notifications are enabled (handle both boolean and string formats)
  SELECT 
    CASE 
      WHEN value::text = 'true' THEN true
      WHEN value::text = '"true"' THEN true
      ELSE false
    END INTO v_email_enabled
  FROM system_settings
  WHERE key = 'email_notifications';
  
  IF NOT v_email_enabled THEN
    RAISE EXCEPTION 'Email notifications are disabled';
  END IF;

  -- Get template
  SELECT id, subject, body INTO v_template_id, v_subject, v_body
  FROM email_templates
  WHERE name = p_template_name AND is_active = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Email template "%" not found or not active', p_template_name;
  END IF;
  
  -- Replace variables in subject and body
  FOR v_var_key, v_var_value IN SELECT * FROM jsonb_each_text(p_variables)
  LOOP
    v_subject := replace(v_subject, '{' || v_var_key || '}', v_var_value);
    v_body := replace(v_body, '{' || v_var_key || '}', v_var_value);
  END LOOP;
  
  -- Log the email
  INSERT INTO email_logs (template_id, recipient, subject, body, status, related_to, related_id)
  VALUES (
    v_template_id,
    p_recipient,
    v_subject,
    v_body,
    'queued',
    p_variables->>'related_to',
    (p_variables->>'related_id')::uuid
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix trigger functions to handle boolean settings correctly
CREATE OR REPLACE FUNCTION notify_new_ticket() RETURNS TRIGGER AS $$
DECLARE
  v_client_email text;
  v_client_name text;
  v_email_enabled boolean;
BEGIN
  -- Check if email notifications are enabled (handle both boolean and string formats)
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
  
  -- Get client email and name
  SELECT email, COALESCE(full_name, email) INTO v_client_email, v_client_name
  FROM users
  WHERE id = NEW.client_id;
  
  -- Send email notification
  BEGIN
    PERFORM send_email(
      'new_ticket',
      v_client_email,
      jsonb_build_object(
        'ticket_id', substring(NEW.id::text, 1, 8),
        'client_name', v_client_name,
        'ticket_title', NEW.title,
        'ticket_description', NEW.description,
        'ticket_priority', NEW.priority,
        'ticket_category', NEW.category,
        'related_to', 'ticket',
        'related_id', NEW.id
      )
    );
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't prevent ticket creation
    RAISE NOTICE 'Error sending email notification: %', SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the trigger
DROP TRIGGER IF EXISTS email_new_ticket_trigger ON tickets;
CREATE TRIGGER email_new_ticket_trigger
AFTER INSERT ON tickets
FOR EACH ROW
EXECUTE FUNCTION notify_new_ticket();