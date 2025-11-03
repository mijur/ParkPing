-- Create enum for user roles
CREATE TYPE user_role AS ENUM ('admin', 'user');

-- Create users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create parking_spaces table
CREATE TABLE public.parking_spaces (
  id SERIAL PRIMARY KEY,
  owner_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create availabilities table
CREATE TABLE public.availabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_id INTEGER NOT NULL REFERENCES public.parking_spaces(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  claimed_by_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- Create indexes for better query performance
CREATE INDEX idx_parking_spaces_owner_id ON public.parking_spaces(owner_id);
CREATE INDEX idx_availabilities_spot_id ON public.availabilities(spot_id);
CREATE INDEX idx_availabilities_dates ON public.availabilities(start_date, end_date);
CREATE INDEX idx_availabilities_claimed_by_id ON public.availabilities(claimed_by_id);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parking_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availabilities ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
-- Users can read their own profile
CREATE POLICY "Users can read own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Users can read all profiles (for admin/user selection)
CREATE POLICY "Users can read all profiles" ON public.users
  FOR SELECT USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for parking_spaces table
-- Anyone authenticated can read parking spaces
CREATE POLICY "Anyone can read parking spaces" ON public.parking_spaces
  FOR SELECT USING (true);

-- Only admins can insert parking spaces
CREATE POLICY "Admins can insert parking spaces" ON public.parking_spaces
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can update parking spaces
CREATE POLICY "Admins can update parking spaces" ON public.parking_spaces
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can delete parking spaces
CREATE POLICY "Admins can delete parking spaces" ON public.parking_spaces
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for availabilities table
-- Anyone authenticated can read availabilities
CREATE POLICY "Anyone can read availabilities" ON public.availabilities
  FOR SELECT USING (true);

-- Parking space owners can insert availabilities for their spots
CREATE POLICY "Owners can insert availabilities" ON public.availabilities
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.parking_spaces
      WHERE id = spot_id AND owner_id = auth.uid()
    )
  );

-- Parking space owners can update their own availabilities
CREATE POLICY "Owners can update own availabilities" ON public.availabilities
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.parking_spaces
      WHERE id = spot_id AND owner_id = auth.uid()
    )
  );

-- Parking space owners can delete their own availabilities
CREATE POLICY "Owners can delete own availabilities" ON public.availabilities
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.parking_spaces
      WHERE id = spot_id AND owner_id = auth.uid()
    )
  );

-- Users can claim availabilities (update claimed_by_id)
CREATE POLICY "Users can claim availabilities" ON public.availabilities
  FOR UPDATE USING (claimed_by_id IS NULL);

-- Function to automatically create user profile when auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    CASE 
      WHEN (SELECT COUNT(*) FROM public.users) = 0 THEN 'admin'::user_role
      ELSE 'user'::user_role
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_parking_spaces_updated_at
  BEFORE UPDATE ON public.parking_spaces
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_availabilities_updated_at
  BEFORE UPDATE ON public.availabilities
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

