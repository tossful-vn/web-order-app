-- Loyalty stamp card system — run in Supabase SQL Editor
-- Two tables: stamp_cards (one active card per user) and stamp_entries (individual stamps)

-- 1. stamp_cards
CREATE TABLE IF NOT EXISTS stamp_cards (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stamps_collected integer NOT NULL DEFAULT 0 CHECK (stamps_collected >= 0 AND stamps_collected <= 8),
  reward_status text NOT NULL DEFAULT 'collecting' CHECK (reward_status IN ('collecting', 'reward_ready', 'redeemed')),
  reward_choice text CHECK (reward_choice IN ('bowl', 'protein', 'topping', 'drink')),
  reward_earned_at timestamptz,
  reward_expires_at timestamptz,
  reward_redeemed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for fast lookup of active card
CREATE INDEX IF NOT EXISTS idx_stamp_cards_user_active 
  ON stamp_cards(user_id, reward_status) 
  WHERE reward_status IN ('collecting', 'reward_ready');

-- RLS
ALTER TABLE stamp_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own cards" ON stamp_cards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own cards" ON stamp_cards FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System inserts cards" ON stamp_cards FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 2. stamp_entries
CREATE TABLE IF NOT EXISTS stamp_entries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id uuid NOT NULL REFERENCES stamp_cards(id) ON DELETE CASCADE,
  stamp_number integer NOT NULL CHECK (stamp_number >= 1 AND stamp_number <= 8),
  ingredient_key text NOT NULL,
  earned_at timestamptz DEFAULT now(),
  UNIQUE(card_id, stamp_number)
);

ALTER TABLE stamp_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own stamps" ON stamp_entries FOR SELECT 
  USING (EXISTS (SELECT 1 FROM stamp_cards WHERE stamp_cards.id = stamp_entries.card_id AND stamp_cards.user_id = auth.uid()));
CREATE POLICY "System inserts stamps" ON stamp_entries FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM stamp_cards WHERE stamp_cards.id = stamp_entries.card_id AND stamp_cards.user_id = auth.uid()));

-- 3. Auto-create card for new users (or on first visit)
-- App logic handles this: if no active card exists, create one.

-- 4. Updated_at trigger
CREATE OR REPLACE FUNCTION update_stamp_card_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER stamp_cards_updated_at
  BEFORE UPDATE ON stamp_cards
  FOR EACH ROW EXECUTE FUNCTION update_stamp_card_timestamp();
