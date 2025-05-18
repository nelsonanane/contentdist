-- Create content_generator_jobs table
CREATE TABLE IF NOT EXISTS content_generator_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  character_type VARCHAR NOT NULL,
  character_attributes JSONB NOT NULL,
  topic VARCHAR NOT NULL,
  status VARCHAR NOT NULL,
  script TEXT,
  image_url TEXT,
  audio_url TEXT,
  video_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE content_generator_jobs ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Allow users to view only their own jobs
CREATE POLICY "Users can view their own content generator jobs"
  ON content_generator_jobs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Allow users to insert their own jobs
CREATE POLICY "Users can create their own content generator jobs"
  ON content_generator_jobs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update only their own jobs
CREATE POLICY "Users can update their own content generator jobs"
  ON content_generator_jobs
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Allow users to delete only their own jobs
CREATE POLICY "Users can delete their own content generator jobs"
  ON content_generator_jobs
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to automatically update updated_at column
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the function when a row is updated
CREATE TRIGGER update_content_generator_jobs_modtime
  BEFORE UPDATE ON content_generator_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_modified_column();
