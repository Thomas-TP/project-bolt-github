/*
  # Email System Setup

  1. New Tables
    - `email_templates` - Store email templates with variables
    - `email_logs` - Log all email sending attempts

  2. Security
    - Enable RLS on both tables
    - Admin-only access policies for templates and logs

  3. Functions
    - Email sending function with template support
    - Trigger functions for automatic notifications

  4. Triggers
    - New ticket notifications
    - Status change notifications
    - Message notifications
    - Assignment notifications

  5. System Settings
    - SMTP configuration settings
*/

-- Create email templates table
CREATE TABLE IF NOT EXISTS email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  subject text NOT NULL,
  body text NOT NULL,
  variables jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES users(id)
);

-- Create email logs table
CREATE TABLE IF NOT EXISTS email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES email_templates(id),
  recipient text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  status text NOT NULL,
  error_message text,
  sent_at timestamptz DEFAULT now(),
  related_to text, -- e.g., 'ticket', 'user', etc.
  related_id uuid -- ID of the related entity
);

-- Enable RLS
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Admins can manage email templates" ON email_templates;
DROP POLICY IF EXISTS "Admins can view email logs" ON email_logs;
DROP POLICY IF EXISTS "Admins can insert email logs" ON email_logs;

-- Policies for email_templates
CREATE POLICY "Admins can manage email templates"
  ON email_templates
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Policies for email_logs
CREATE POLICY "Admins can view email logs"
  ON email_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert email logs"
  ON email_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Insert default email templates (only if they don't exist)
INSERT INTO email_templates (name, subject, body, variables)
SELECT * FROM (VALUES 
  (
    'new_ticket',
    'Votre ticket #{ticket_id} a été créé',
    '<h1>Nouveau ticket créé</h1>
    <p>Bonjour {client_name},</p>
    <p>Votre ticket <strong>#{ticket_id}</strong> a été créé avec succès.</p>
    <p><strong>Titre:</strong> {ticket_title}</p>
    <p><strong>Description:</strong> {ticket_description}</p>
    <p><strong>Priorité:</strong> {ticket_priority}</p>
    <p><strong>Catégorie:</strong> {ticket_category}</p>
    <p>Nous vous contacterons dès que possible.</p>
    <p>Cordialement,<br>L''équipe Support</p>',
    '["ticket_id", "client_name", "ticket_title", "ticket_description", "ticket_priority", "ticket_category"]'::jsonb
  ),
  (
    'ticket_assigned',
    'Ticket #{ticket_id} assigné à {agent_name}',
    '<h1>Ticket assigné</h1>
    <p>Bonjour {client_name},</p>
    <p>Votre ticket <strong>#{ticket_id}</strong> a été assigné à <strong>{agent_name}</strong>.</p>
    <p>Un agent va maintenant traiter votre demande.</p>
    <p>Cordialement,<br>L''équipe Support</p>',
    '["ticket_id", "client_name", "agent_name"]'::jsonb
  ),
  (
    'new_message',
    'Nouveau message sur le ticket #{ticket_id}',
    '<h1>Nouveau message</h1>
    <p>Bonjour {recipient_name},</p>
    <p>Un nouveau message a été ajouté au ticket <strong>#{ticket_id}</strong>.</p>
    <p><strong>De:</strong> {sender_name}</p>
    <p><strong>Message:</strong></p>
    <p>{message_content}</p>
    <p>Cordialement,<br>L''équipe Support</p>',
    '["ticket_id", "recipient_name", "sender_name", "message_content"]'::jsonb
  ),
  (
    'ticket_status_update',
    'Statut du ticket #{ticket_id} mis à jour: {ticket_status}',
    '<h1>Mise à jour de statut</h1>
    <p>Bonjour {client_name},</p>
    <p>Le statut de votre ticket <strong>#{ticket_id}</strong> a été mis à jour à <strong>{ticket_status}</strong>.</p>
    <p><strong>Titre:</strong> {ticket_title}</p>
    <p>Cordialement,<br>L''équipe Support</p>',
    '["ticket_id", "client_name", "ticket_title", "ticket_status"]'::jsonb
  ),
  (
    'ticket_resolved',
    'Ticket #{ticket_id} résolu - Votre avis est important',
    '<h1>Ticket résolu</h1>
    <p>Bonjour {client_name},</p>
    <p>Votre ticket <strong>#{ticket_id}</strong> a été marqué comme résolu.</p>
    <p><strong>Titre:</strong> {ticket_title}</p>
    <p>Nous vous invitons à évaluer notre service en répondant à cette enquête de satisfaction.</p>
    <p><a href="{satisfaction_url}">Évaluer notre service</a></p>
    <p>Cordialement,<br>L''équipe Support</p>',
    '["ticket_id", "client_name", "ticket_title", "satisfaction_url"]'::jsonb
  ),
  (
    'welcome_email',
    'Bienvenue sur notre plateforme de support',
    '<h1>Bienvenue !</h1>
    <p>Bonjour {user_name},</p>
    <p>Bienvenue sur notre plateforme de support technique.</p>
    <p>Vous pouvez désormais créer des tickets et suivre leur progression.</p>
    <p>Cordialement,<br>L''équipe Support</p>',
    '["user_name"]'::jsonb
  ),
  (
    'password_reset',
    'Réinitialisation de votre mot de passe',
    '<h1>Réinitialisation de mot de passe</h1>
    <p>Bonjour {user_name},</p>
    <p>Vous avez demandé une réinitialisation de votre mot de passe.</p>
    <p>Cliquez sur le lien ci-dessous pour définir un nouveau mot de passe :</p>
    <p><a href="{reset_url}">Réinitialiser mon mot de passe</a></p>
    <p>Si vous n''avez pas demandé cette réinitialisation, veuillez ignorer cet email.</p>
    <p>Cordialement,<br>L''équipe Support</p>',
    '["user_name", "reset_url"]'::jsonb
  )
) AS t(name, subject, body, variables)
WHERE NOT EXISTS (
  SELECT 1 FROM email_templates WHERE name = t.name
);

-- Create or replace function to send email (placeholder for edge function)
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
BEGIN
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
  
  -- Log the email (in a real implementation, this would also send the email)
  INSERT INTO email_logs (template_id, recipient, subject, body, status, related_to, related_id)
  VALUES (
    v_template_id,
    p_recipient,
    v_subject,
    v_body,
    'queued', -- In a real implementation, this would be 'sent' after sending
    p_variables->>'related_to',
    (p_variables->>'related_id')::uuid
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger functions if they exist
DROP FUNCTION IF EXISTS notify_new_ticket() CASCADE;
DROP FUNCTION IF EXISTS notify_ticket_status_change() CASCADE;
DROP FUNCTION IF EXISTS notify_new_message() CASCADE;
DROP FUNCTION IF EXISTS notify_ticket_assignment() CASCADE;

-- Create trigger function to send email notifications for new tickets
CREATE OR REPLACE FUNCTION notify_new_ticket() RETURNS TRIGGER AS $$
DECLARE
  v_client_email text;
  v_client_name text;
  v_email_enabled boolean;
BEGIN
  -- Check if email notifications are enabled
  SELECT value::boolean INTO v_email_enabled
  FROM system_settings
  WHERE key = 'email_notifications';
  
  IF v_email_enabled IS NULL OR NOT v_email_enabled THEN
    RETURN NEW;
  END IF;
  
  -- Get client email and name
  SELECT email, COALESCE(full_name, email) INTO v_client_email, v_client_name
  FROM users
  WHERE id = NEW.client_id;
  
  -- Send email notification
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
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new tickets
DROP TRIGGER IF EXISTS email_new_ticket_trigger ON tickets;
CREATE TRIGGER email_new_ticket_trigger
AFTER INSERT ON tickets
FOR EACH ROW
EXECUTE FUNCTION notify_new_ticket();

-- Create trigger function to send email notifications for ticket status changes
CREATE OR REPLACE FUNCTION notify_ticket_status_change() RETURNS TRIGGER AS $$
DECLARE
  v_client_email text;
  v_client_name text;
  v_email_enabled boolean;
  v_template_name text;
BEGIN
  -- Only proceed if status has changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- Check if email notifications are enabled
  SELECT value::boolean INTO v_email_enabled
  FROM system_settings
  WHERE key = 'email_notifications';
  
  IF v_email_enabled IS NULL OR NOT v_email_enabled THEN
    RETURN NEW;
  END IF;
  
  -- Get client email and name
  SELECT email, COALESCE(full_name, email) INTO v_client_email, v_client_name
  FROM users
  WHERE id = NEW.client_id;
  
  -- Determine which template to use
  IF NEW.status = 'resolu' THEN
    v_template_name := 'ticket_resolved';
  ELSE
    v_template_name := 'ticket_status_update';
  END IF;
  
  -- Send email notification
  PERFORM send_email(
    v_template_name,
    v_client_email,
    jsonb_build_object(
      'ticket_id', substring(NEW.id::text, 1, 8),
      'client_name', v_client_name,
      'ticket_title', NEW.title,
      'ticket_status', NEW.status,
      'satisfaction_url', 'https://helpdesk.example.com/satisfaction/' || NEW.id,
      'related_to', 'ticket',
      'related_id', NEW.id
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for ticket status changes
DROP TRIGGER IF EXISTS email_ticket_status_trigger ON tickets;
CREATE TRIGGER email_ticket_status_trigger
AFTER UPDATE ON tickets
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION notify_ticket_status_change();

-- Create trigger function to send email notifications for new messages
CREATE OR REPLACE FUNCTION notify_new_message() RETURNS TRIGGER AS $$
DECLARE
  v_ticket record;
  v_sender record;
  v_recipient record;
  v_recipient_id uuid;
  v_email_enabled boolean;
BEGIN
  -- Check if email notifications are enabled
  SELECT value::boolean INTO v_email_enabled
  FROM system_settings
  WHERE key = 'email_notifications';
  
  IF v_email_enabled IS NULL OR NOT v_email_enabled THEN
    RETURN NEW;
  END IF;
  
  -- Skip internal messages for clients
  IF NEW.is_internal THEN
    RETURN NEW;
  END IF;
  
  -- Get ticket info
  SELECT * INTO v_ticket
  FROM tickets
  WHERE id = NEW.ticket_id;
  
  -- Get sender info
  SELECT * INTO v_sender
  FROM users
  WHERE id = NEW.user_id;
  
  -- Determine recipient (if sender is client, send to agent, otherwise send to client)
  IF v_sender.role = 'client' THEN
    v_recipient_id := v_ticket.agent_id;
  ELSE
    v_recipient_id := v_ticket.client_id;
  END IF;
  
  -- Only proceed if we have a recipient
  IF v_recipient_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get recipient info
  SELECT * INTO v_recipient
  FROM users
  WHERE id = v_recipient_id;
  
  -- Send email notification
  PERFORM send_email(
    'new_message',
    v_recipient.email,
    jsonb_build_object(
      'ticket_id', substring(NEW.ticket_id::text, 1, 8),
      'recipient_name', COALESCE(v_recipient.full_name, v_recipient.email),
      'sender_name', COALESCE(v_sender.full_name, v_sender.email),
      'message_content', NEW.content,
      'related_to', 'message',
      'related_id', NEW.id
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new messages
DROP TRIGGER IF EXISTS email_new_message_trigger ON messages;
CREATE TRIGGER email_new_message_trigger
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION notify_new_message();

-- Create trigger function to send email notifications for ticket assignment
CREATE OR REPLACE FUNCTION notify_ticket_assignment() RETURNS TRIGGER AS $$
DECLARE
  v_client_email text;
  v_client_name text;
  v_agent_name text;
  v_email_enabled boolean;
BEGIN
  -- Only proceed if agent_id has changed and is not null
  IF (OLD.agent_id = NEW.agent_id) OR (NEW.agent_id IS NULL) THEN
    RETURN NEW;
  END IF;
  
  -- Check if email notifications are enabled
  SELECT value::boolean INTO v_email_enabled
  FROM system_settings
  WHERE key = 'email_notifications';
  
  IF v_email_enabled IS NULL OR NOT v_email_enabled THEN
    RETURN NEW;
  END IF;
  
  -- Get client email and name
  SELECT email, COALESCE(full_name, email) INTO v_client_email, v_client_name
  FROM users
  WHERE id = NEW.client_id;
  
  -- Get agent name
  SELECT COALESCE(full_name, email) INTO v_agent_name
  FROM users
  WHERE id = NEW.agent_id;
  
  -- Send email notification
  PERFORM send_email(
    'ticket_assigned',
    v_client_email,
    jsonb_build_object(
      'ticket_id', substring(NEW.id::text, 1, 8),
      'client_name', v_client_name,
      'agent_name', v_agent_name,
      'related_to', 'ticket',
      'related_id', NEW.id
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for ticket assignment
DROP TRIGGER IF EXISTS email_ticket_assignment_trigger ON tickets;
CREATE TRIGGER email_ticket_assignment_trigger
AFTER UPDATE ON tickets
FOR EACH ROW
WHEN (OLD.agent_id IS DISTINCT FROM NEW.agent_id AND NEW.agent_id IS NOT NULL)
EXECUTE FUNCTION notify_ticket_assignment();

-- Add system settings for SMTP configuration if they don't exist
DO $$
BEGIN
  -- SMTP Host
  IF NOT EXISTS (SELECT 1 FROM system_settings WHERE key = 'smtp_host') THEN
    INSERT INTO system_settings (key, value, description)
    VALUES ('smtp_host', '', 'SMTP server hostname');
  END IF;

  -- SMTP Port
  IF NOT EXISTS (SELECT 1 FROM system_settings WHERE key = 'smtp_port') THEN
    INSERT INTO system_settings (key, value, description)
    VALUES ('smtp_port', '587', 'SMTP server port');
  END IF;

  -- SMTP Secure
  IF NOT EXISTS (SELECT 1 FROM system_settings WHERE key = 'smtp_secure') THEN
    INSERT INTO system_settings (key, value, description)
    VALUES ('smtp_secure', 'false', 'Use SSL/TLS for SMTP');
  END IF;

  -- SMTP Username
  IF NOT EXISTS (SELECT 1 FROM system_settings WHERE key = 'smtp_username') THEN
    INSERT INTO system_settings (key, value, description)
    VALUES ('smtp_username', '', 'SMTP username');
  END IF;

  -- SMTP Password
  IF NOT EXISTS (SELECT 1 FROM system_settings WHERE key = 'smtp_password') THEN
    INSERT INTO system_settings (key, value, description)
    VALUES ('smtp_password', '', 'SMTP password');
  END IF;

  -- SMTP From Email
  IF NOT EXISTS (SELECT 1 FROM system_settings WHERE key = 'smtp_from_email') THEN
    INSERT INTO system_settings (key, value, description)
    VALUES ('smtp_from_email', '', 'Email address to send from');
  END IF;

  -- SMTP From Name
  IF NOT EXISTS (SELECT 1 FROM system_settings WHERE key = 'smtp_from_name') THEN
    INSERT INTO system_settings (key, value, description)
    VALUES ('smtp_from_name', 'HelpDesk Support', 'Name to display as sender');
  END IF;

  -- SMTP Enabled
  IF NOT EXISTS (SELECT 1 FROM system_settings WHERE key = 'smtp_enabled') THEN
    INSERT INTO system_settings (key, value, description)
    VALUES ('smtp_enabled', 'false', 'Enable email notifications');
  END IF;

  -- Email Notifications
  IF NOT EXISTS (SELECT 1 FROM system_settings WHERE key = 'email_notifications') THEN
    INSERT INTO system_settings (key, value, description)
    VALUES ('email_notifications', 'false', 'Enable email notifications');
  END IF;
END $$;