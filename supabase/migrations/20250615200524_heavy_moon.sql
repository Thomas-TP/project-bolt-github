/*
  # Add Malware Scanning Support

  1. New Table
    - `malware_scans` - Stores results of malware scans on uploaded files
      - `id` (uuid, primary key)
      - `file_name` (text, name of the scanned file)
      - `file_size` (integer, size in bytes)
      - `file_type` (text, MIME type)
      - `file_id` (uuid, optional reference to file_storage)
      - `scan_id` (text, unique identifier for the scan)
      - `is_clean` (boolean, whether the file is clean)
      - `threats` (text[], array of detected threats)
      - `scanned_by` (uuid, reference to users)
      - `scanned_at` (timestamptz, when the scan was performed)

  2. Security
    - Enable RLS on `malware_scans` table
    - Add policies for admin access
*/

-- Create malware_scans table
CREATE TABLE IF NOT EXISTS malware_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text NOT NULL,
  file_size integer NOT NULL,
  file_type text,
  file_id uuid REFERENCES file_storage(id) ON DELETE SET NULL,
  scan_id text,
  is_clean boolean NOT NULL,
  threats text[],
  scanned_by uuid REFERENCES users(id),
  scanned_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_malware_scans_file_id ON malware_scans(file_id);
CREATE INDEX IF NOT EXISTS idx_malware_scans_scanned_at ON malware_scans(scanned_at);
CREATE INDEX IF NOT EXISTS idx_malware_scans_is_clean ON malware_scans(is_clean);
CREATE INDEX IF NOT EXISTS idx_malware_scans_scanned_by ON malware_scans(scanned_by);

-- Enable RLS
ALTER TABLE malware_scans ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can view all scan results"
  ON malware_scans
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'agent')
    )
  );

CREATE POLICY "Users can view their own scan results"
  ON malware_scans
  FOR SELECT
  TO authenticated
  USING (scanned_by = auth.uid());

CREATE POLICY "Users can insert scan results"
  ON malware_scans
  FOR INSERT
  TO authenticated
  WITH CHECK (scanned_by = auth.uid());

-- Add system settings for malware scanning
INSERT INTO system_settings (key, value, description)
VALUES 
  ('malware_scan_enabled', 'true', 'Enable malware scanning for uploaded files'),
  ('block_malicious_files', 'true', 'Automatically block files detected as malicious'),
  ('scan_file_types', '["pdf", "doc", "docx", "xls", "xlsx", "zip", "rar", "exe", "dll"]', 'File types to scan for malware')
ON CONFLICT (key) DO NOTHING;

-- Create function to check if a file is malicious
CREATE OR REPLACE FUNCTION is_file_malicious(
  p_file_id uuid
) RETURNS boolean AS $$
DECLARE
  v_is_malicious boolean;
BEGIN
  SELECT NOT is_clean INTO v_is_malicious
  FROM malware_scans
  WHERE file_id = p_file_id
  ORDER BY scanned_at DESC
  LIMIT 1;
  
  RETURN COALESCE(v_is_malicious, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;