-- First drop any existing foreign key constraint 
ALTER TABLE IF EXISTS brand_settings DROP CONSTRAINT IF EXISTS brand_settings_user_id_fkey;

-- Drop the existing table if there's an issue with it (using CASCADE to drop any dependent objects)
DROP TABLE IF EXISTS brand_settings CASCADE;

-- Create brand_settings table without foreign key constraints to auth.users
CREATE TABLE brand_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  brand_name TEXT,
  brand_description TEXT,
  primary_color TEXT NOT NULL DEFAULT '#4F46E5',
  secondary_color TEXT NOT NULL DEFAULT '#10B981',
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create RLS policies for brand_settings
ALTER TABLE brand_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid errors
DROP POLICY IF EXISTS "Users can view their own brand settings" ON brand_settings;
DROP POLICY IF EXISTS "Users can insert their own brand settings" ON brand_settings;
DROP POLICY IF EXISTS "Users can update their own brand settings" ON brand_settings;

-- Policy to allow users to select their own brand settings
CREATE POLICY "Users can view their own brand settings" 
  ON brand_settings 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Policy to allow users to insert their own brand settings
CREATE POLICY "Users can insert their own brand settings" 
  ON brand_settings 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Policy to allow users to update their own brand settings
CREATE POLICY "Users can update their own brand settings" 
  ON brand_settings 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Create storage bucket for brand assets if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('brand_assets', 'Brand Assets', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies if they exist to avoid errors
DROP POLICY IF EXISTS "Users can upload brand assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own brand assets" ON storage.objects;
DROP POLICY IF EXISTS "Brand assets are publicly accessible" ON storage.objects;

-- Create storage policy to allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload brand assets"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'brand_assets' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Create storage policy to allow users to update their own files
CREATE POLICY "Users can update their own brand assets"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'brand_assets' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Create storage policy to allow public access to brand assets
CREATE POLICY "Brand assets are publicly accessible"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'brand_assets');
