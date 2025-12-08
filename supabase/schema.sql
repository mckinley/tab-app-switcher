-- Tab Application Switcher - Supabase Schema
-- Run this in Supabase SQL Editor after creating your project

-- Collections table
-- Stores user's tab collections with full tab data for offline-first sync
CREATE TABLE IF NOT EXISTS collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  tabs JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for faster user-specific queries
CREATE INDEX IF NOT EXISTS collections_user_id_idx ON collections(user_id);

-- Index for sync operations (finding recently updated collections)
CREATE INDEX IF NOT EXISTS collections_updated_at_idx ON collections(updated_at);

-- Enable Row Level Security
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own collections
CREATE POLICY "Users can view their own collections"
  ON collections
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own collections
CREATE POLICY "Users can insert their own collections"
  ON collections
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own collections
CREATE POLICY "Users can update their own collections"
  ON collections
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete their own collections
CREATE POLICY "Users can delete their own collections"
  ON collections
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at on collection changes
CREATE TRIGGER update_collections_updated_at
  BEFORE UPDATE ON collections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE collections IS 'User tab collections for cross-device sync';
COMMENT ON COLUMN collections.tabs IS 'Array of {url, title, favicon} objects';
COMMENT ON COLUMN collections.updated_at IS 'Used for last-write-wins conflict resolution';

