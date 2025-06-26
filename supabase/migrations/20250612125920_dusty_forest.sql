/*
  # Configure Resend API for Email System

  1. Configuration Updates
    - Add Resend API key to system settings
    - Enable email notifications
    - Update SMTP settings for compatibility

  2. Security
    - Store API key securely in system settings
    - Maintain backward compatibility with existing settings
*/

-- Add Resend API key to system settings (value stored as JSON string)
DO $$
BEGIN
  -- Resend API Key (stored as JSON string)
  IF NOT EXISTS (SELECT 1 FROM system_settings WHERE key = 'resend_api_key') THEN
    INSERT INTO system_settings (key, value, description, updated_by, updated_at)
    VALUES (
      'resend_api_key', 
      '"re_aF4Gs4pG_LncTYXwQeHwmQMAuBuDEUqZy"'::jsonb, 
      'Resend API Key for email sending',
      NULL,
      now()
    );
  ELSE
    UPDATE system_settings 
    SET 
      value = '"re_aF4Gs4pG_LncTYXwQeHwmQMAuBuDEUqZy"'::jsonb,
      updated_at = now()
    WHERE key = 'resend_api_key';
  END IF;

  -- Enable email notifications by default
  IF EXISTS (SELECT 1 FROM system_settings WHERE key = 'email_notifications') THEN
    UPDATE system_settings 
    SET 
      value = '"true"'::jsonb,
      updated_at = now()
    WHERE key = 'email_notifications';
  ELSE
    INSERT INTO system_settings (key, value, description, updated_by, updated_at)
    VALUES (
      'email_notifications', 
      '"true"'::jsonb, 
      'Enable email notifications system-wide',
      NULL,
      now()
    );
  END IF;
  
  -- Update SMTP enabled to true (for backward compatibility)
  IF EXISTS (SELECT 1 FROM system_settings WHERE key = 'smtp_enabled') THEN
    UPDATE system_settings 
    SET 
      value = '"true"'::jsonb,
      updated_at = now()
    WHERE key = 'smtp_enabled';
  ELSE
    INSERT INTO system_settings (key, value, description, updated_by, updated_at)
    VALUES (
      'smtp_enabled', 
      '"true"'::jsonb, 
      'Enable SMTP/Email system (legacy compatibility)',
      NULL,
      now()
    );
  END IF;

  -- Add email provider setting to indicate we're using Resend
  IF NOT EXISTS (SELECT 1 FROM system_settings WHERE key = 'email_provider') THEN
    INSERT INTO system_settings (key, value, description, updated_by, updated_at)
    VALUES (
      'email_provider', 
      '"resend"'::jsonb, 
      'Email service provider (resend, smtp)',
      NULL,
      now()
    );
  ELSE
    UPDATE system_settings 
    SET 
      value = '"resend"'::jsonb,
      updated_at = now()
    WHERE key = 'email_provider';
  END IF;

END $$;