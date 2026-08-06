-- ============================================
-- STEP 1: Buat table reset_log (jika belum ada)
-- Jalankan di Supabase SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS reset_log (
  id BIGSERIAL PRIMARY KEY,
  reset_count INTEGER DEFAULT 0,
  last_reset_at TIMESTAMPTZ DEFAULT NOW(),
  records_deleted INTEGER DEFAULT 0
);

-- Insert record pertama jika belum ada
INSERT INTO reset_log (reset_count, last_reset_at, records_deleted)
SELECT 0, NOW(), 0
WHERE NOT EXISTS (SELECT 1 FROM reset_log LIMIT 1);

-- Policy untuk reset_log
ALTER TABLE reset_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read for all" ON reset_log
  FOR SELECT USING (true);

CREATE POLICY "Allow insert for all" ON reset_log
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update for all" ON reset_log
  FOR UPDATE USING (true);


-- ============================================
-- STEP 2: Buat function untuk auto-reset
-- ============================================

CREATE OR REPLACE FUNCTION auto_reset_lyrics_history()
RETURNS void AS $$
DECLARE
  current_count INTEGER;
  total_records INTEGER;
BEGIN
  -- Hitung total record di lyrics_history
  SELECT COUNT(*) INTO total_records FROM lyrics_history;

  -- Kalau sudah 100 atau lebih, reset
  IF total_records >= 100 THEN
    -- Hapus semua record
    DELETE FROM lyrics_history;

    -- Update reset_log
    UPDATE reset_log
    SET reset_count = reset_count + 1,
        last_reset_at = NOW(),
        records_deleted = total_records;

    RAISE NOTICE 'Lyrics history reset! Deleted % records.', total_records;
  END IF;
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- STEP 3: Aktifkan pg_cron (jika belum)
-- ============================================
-- Catatan: pg_cron harus diaktifkan di Supabase Dashboard
-- Settings → Database → Extensions → aktifkan "pg_cron"


-- ============================================
-- STEP 4: Buat cron job (run setiap menit)
-- ============================================
-- Jalankan ini SETELAH pg_cron diaktifkan

SELECT cron.schedule(
  'auto-reset-lyrics',        -- nama job
  '* * * * *',                -- setiap menit
  $$SELECT auto_reset_lyrics_history()$$
);


-- ============================================
-- STEP 5: Query untuk cek status
-- ============================================

-- Cek berapa kali reset
SELECT reset_count, last_reset_at, records_deleted FROM reset_log ORDER BY id DESC LIMIT 1;

-- Cek jumlah record saat ini
SELECT COUNT(*) AS total_records FROM lyrics_history;

-- Cek semua cron job
SELECT * FROM cron.job;
