-- PromptMux Initial Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- API Keys table (BYOK - Bring Your Own Key)
-- ============================================
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  encrypted_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- ============================================
-- Folders for organization
-- ============================================
CREATE TABLE IF NOT EXISTS folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Prompt maps (saved sessions)
-- ============================================
CREATE TABLE IF NOT EXISTS prompt_maps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  prompt TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Model responses within a prompt map
-- ============================================
CREATE TABLE IF NOT EXISTS model_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prompt_map_id UUID NOT NULL REFERENCES prompt_maps(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  response TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  notes TEXT,
  latency_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Enable Row Level Security
-- ============================================
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_responses ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies
-- ============================================

-- API Keys: Users can only access their own keys
CREATE POLICY "Users can view own API keys" ON api_keys
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own API keys" ON api_keys
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own API keys" ON api_keys
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own API keys" ON api_keys
  FOR DELETE USING (auth.uid() = user_id);

-- Folders: Users can only access their own folders
CREATE POLICY "Users can view own folders" ON folders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own folders" ON folders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own folders" ON folders
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own folders" ON folders
  FOR DELETE USING (auth.uid() = user_id);

-- Prompt Maps: Users can only access their own maps
CREATE POLICY "Users can view own prompt maps" ON prompt_maps
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own prompt maps" ON prompt_maps
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own prompt maps" ON prompt_maps
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own prompt maps" ON prompt_maps
  FOR DELETE USING (auth.uid() = user_id);

-- Model Responses: Users can access responses from their own maps
CREATE POLICY "Users can view responses from own maps" ON model_responses
  FOR SELECT USING (
    prompt_map_id IN (SELECT id FROM prompt_maps WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert responses to own maps" ON model_responses
  FOR INSERT WITH CHECK (
    prompt_map_id IN (SELECT id FROM prompt_maps WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update responses from own maps" ON model_responses
  FOR UPDATE USING (
    prompt_map_id IN (SELECT id FROM prompt_maps WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete responses from own maps" ON model_responses
  FOR DELETE USING (
    prompt_map_id IN (SELECT id FROM prompt_maps WHERE user_id = auth.uid())
  );

-- ============================================
-- Indexes for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_prompt_maps_user_id ON prompt_maps(user_id);
CREATE INDEX IF NOT EXISTS idx_prompt_maps_folder_id ON prompt_maps(folder_id);
CREATE INDEX IF NOT EXISTS idx_model_responses_prompt_map_id ON model_responses(prompt_map_id);

-- ============================================
-- Updated_at trigger function
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_api_keys_updated_at
  BEFORE UPDATE ON api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prompt_maps_updated_at
  BEFORE UPDATE ON prompt_maps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
