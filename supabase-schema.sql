-- Jalankan ini di Supabase SQL Editor
-- https://supabase.com/dashboard/project/_/sql

CREATE TABLE lyrics_history (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_tag TEXT NOT NULL,
  song_title TEXT NOT NULL,
  artist TEXT NOT NULL,
  guild_id TEXT,
  guild_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index untuk query cepat
CREATE INDEX idx_lyrics_history_user_id ON lyrics_history(user_id);
CREATE INDEX idx_lyrics_history_created_at ON lyrics_history(created_at DESC);

-- (Optional) Aktifkan Row Level Security
ALTER TABLE lyrics_history ENABLE ROW LEVEL SECURITY;

-- Policy: semua orang bisa insert
CREATE POLICY "Allow insert for all" ON lyrics_history
  FOR INSERT WITH CHECK (true);

-- Policy: semua orang bisa read
CREATE POLICY "Allow read for all" ON lyrics_history
  FOR SELECT USING (true);
