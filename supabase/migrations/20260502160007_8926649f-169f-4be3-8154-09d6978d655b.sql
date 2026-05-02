
-- ============ Helper: updated_at trigger ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  preferred_market TEXT,
  risk_per_trade NUMERIC DEFAULT 0.5,
  default_account_type TEXT NOT NULL DEFAULT 'demo',
  trading_style TEXT NOT NULL DEFAULT 'day_trading',
  subscription_plan TEXT NOT NULL DEFAULT 'free',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email) VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ TRADES ============
CREATE TABLE public.trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pair TEXT NOT NULL,
  side TEXT,
  result NUMERIC,
  trade_date DATE NOT NULL DEFAULT CURRENT_DATE,
  entry_price NUMERIC,
  exit_price NUMERIC,
  quantity NUMERIC,
  setup TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own trades select" ON public.trades FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own trades insert" ON public.trades FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own trades update" ON public.trades FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own trades delete" ON public.trades FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_trades_user_date ON public.trades(user_id, trade_date DESC);
CREATE TRIGGER trg_trades_updated BEFORE UPDATE ON public.trades
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ PLAYBOOKS ============
CREATE TABLE public.playbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  rules TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.playbooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own pb select" ON public.playbooks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own pb insert" ON public.playbooks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own pb update" ON public.playbooks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own pb delete" ON public.playbooks FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER trg_playbooks_updated BEFORE UPDATE ON public.playbooks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ JOURNAL ENTRIES ============
CREATE TABLE public.journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  mood TEXT,
  mistakes TEXT,
  lesson TEXT,
  bias TEXT,
  notes TEXT,
  energy_level INTEGER,
  confidence_level INTEGER,
  rule_adherence INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own j select" ON public.journal_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own j insert" ON public.journal_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own j update" ON public.journal_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own j delete" ON public.journal_entries FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_journal_user_date ON public.journal_entries(user_id, entry_date DESC);
CREATE TRIGGER trg_journal_updated BEFORE UPDATE ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ REPLAY SESSIONS ============
CREATE TABLE public.replay_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  replay_date DATE NOT NULL DEFAULT CURRENT_DATE,
  pair TEXT NOT NULL,
  setup TEXT,
  notes TEXT,
  execution_score INTEGER,
  result NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.replay_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own r select" ON public.replay_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own r insert" ON public.replay_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own r update" ON public.replay_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own r delete" ON public.replay_sessions FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_replay_user_date ON public.replay_sessions(user_id, replay_date DESC);
CREATE TRIGGER trg_replay_updated BEFORE UPDATE ON public.replay_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
