-- First check if the table exists, if not create it
-- First drop any existing foreign key constraint
ALTER TABLE IF EXISTS brand_settings DROP CONSTRAINT IF EXISTS brand_settings_user_id_fkey;

-- Drop and recreate the table to ensure clean state
DROP TABLE IF EXISTS brand_settings CASCADE;

-- Create brand_settings table without foreign key constraints
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
    
    -- Add brand_name if neither name nor brand_name exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public'
                   AND table_name = 'brand_settings' 
                   AND column_name = 'brand_name') THEN
      ALTER TABLE brand_settings ADD COLUMN brand_name TEXT;
    END IF;
    
    -- Check for description column and rename to brand_description if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public'
               AND table_name = 'brand_settings' 
               AND column_name = 'description') THEN
      ALTER TABLE brand_settings RENAME COLUMN description TO brand_description;
    END IF;
    
    -- Add brand_description if neither description nor brand_description exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public'
                   AND table_name = 'brand_settings' 
                   AND column_name = 'brand_description') THEN
      ALTER TABLE brand_settings ADD COLUMN brand_description TEXT;
    END IF;
    
    -- Add primary_color column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public'
                   AND table_name = 'brand_settings' 
                   AND column_name = 'primary_color') THEN
      ALTER TABLE brand_settings ADD COLUMN primary_color TEXT NOT NULL DEFAULT '#4F46E5';
    END IF;
    
    -- Add secondary_color column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public'
                   AND table_name = 'brand_settings' 
                   AND column_name = 'secondary_color') THEN
      ALTER TABLE brand_settings ADD COLUMN secondary_color TEXT NOT NULL DEFAULT '#10B981';
    END IF;
    
    -- Add logo_url column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public'
                   AND table_name = 'brand_settings' 
                   AND column_name = 'logo_url') THEN
      ALTER TABLE brand_settings ADD COLUMN logo_url TEXT;
    END IF;
  END IF;
END $$;

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

-- Create a stored procedure for safely creating brand settings without FK issues
CREATE OR REPLACE FUNCTION create_brand_settings_safe(
  p_user_id UUID,
  p_brand_name TEXT,
  p_brand_description TEXT,
  p_primary_color TEXT DEFAULT '#4F46E5',
  p_secondary_color TEXT DEFAULT '#10B981',
  p_logo_url TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_id UUID;
  v_result JSONB;
BEGIN
  -- Insert the record directly without FK check
  INSERT INTO brand_settings (
    user_id, brand_name, brand_description, 
    primary_color, secondary_color, logo_url,
    created_at, updated_at
  ) VALUES (
    p_user_id, p_brand_name, p_brand_description,
    p_primary_color, p_secondary_color, p_logo_url,
    NOW(), NOW()
  ) RETURNING id INTO v_id;
  
  -- Return the created record as JSON
  SELECT jsonb_build_object(
    'id', id,
    'user_id', user_id,
    'brand_name', brand_name,
    'brand_description', brand_description,
    'primary_color', primary_color,
    'secondary_color', secondary_color,
    'logo_url', logo_url,
    'created_at', created_at,
    'updated_at', updated_at
  ) INTO v_result
  FROM brand_settings
  WHERE id = v_id;
  
  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
