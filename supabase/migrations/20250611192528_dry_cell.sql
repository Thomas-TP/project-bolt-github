/*
  # Fix user access and RLS policies

  1. Problem Analysis
    - User is authenticated in Supabase Auth but doesn't exist in users table
    - RLS policies prevent access because user profile doesn't exist yet
    - Need to allow profile creation for new authenticated users

  2. Solution
    - Simplify RLS policies to avoid recursion
    - Allow authenticated users to create their profile
    - Use auth.uid() directly instead of complex joins

  3. Security
    - Maintain security by only allowing users to access their own data
    - Agents and admins get broader access through metadata checks
*/

-- Disable RLS temporarily to clean up
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_insert_own" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "agents_select_all" ON users;
DROP POLICY IF EXISTS "admins_update_all" ON users;

-- Re-enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can read their own profile
CREATE POLICY "users_can_read_own_profile" ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Policy 2: Users can create their own profile (essential for new users)
CREATE POLICY "users_can_create_own_profile" ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Policy 3: Users can update their own profile
CREATE POLICY "users_can_update_own_profile" ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy 4: Agents and admins can read all profiles (using auth metadata)
CREATE POLICY "agents_can_read_all_profiles" ON users
  FOR SELECT
  TO authenticated
  USING (
    -- User can always read their own profile
    auth.uid() = id
    OR
    -- Or if they are an agent/admin (check auth metadata)
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' IN ('agent', 'admin')
  );

-- Policy 5: Admins can update any profile
CREATE POLICY "admins_can_update_all_profiles" ON users
  FOR UPDATE
  TO authenticated
  USING (
    -- User can update their own profile
    auth.uid() = id
    OR
    -- Or if they are an admin
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin'
  );