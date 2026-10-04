-- Membuat tabel profil keuangan user
CREATE TABLE public.user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  currency TEXT DEFAULT 'IDR',
  monthly_income NUMERIC DEFAULT 0,
  financial_goal TEXT,
  risk_profile TEXT,
  is_onboarded BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Mengaktifkan Row Level Security (RLS)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Membuat policy agar user hanya bisa melihat & mengedit profilnya sendiri
CREATE POLICY "Users can view own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can modify own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);