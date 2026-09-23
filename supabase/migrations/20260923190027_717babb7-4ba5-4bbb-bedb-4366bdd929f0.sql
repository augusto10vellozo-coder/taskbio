CREATE TYPE public.app_role AS ENUM ('user', 'professional', 'admin');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  display_name text NOT NULL DEFAULT '',
  avatar_url text,
  goal text,
  preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_read_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_delete_own" ON public.profiles FOR DELETE TO authenticated USING (auth.uid() = id);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "roles_read_own" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

CREATE TABLE public.user_data (
  user_id uuid PRIMARY KEY,
  plan jsonb NOT NULL DEFAULT '{}'::jsonb,
  workouts jsonb NOT NULL DEFAULT '[]'::jsonb,
  meals jsonb NOT NULL DEFAULT '[]'::jsonb,
  shopping_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_data TO authenticated;
GRANT ALL ON public.user_data TO service_role;
ALTER TABLE public.user_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_data_read_own" ON public.user_data FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "user_data_insert_own" ON public.user_data FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_data_update_own" ON public.user_data FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_data_delete_own" ON public.user_data FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.progress_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  entry_date date NOT NULL DEFAULT current_date,
  kind text NOT NULL CHECK (kind IN ('weight', 'measurement', 'strength', 'run', 'consistency')),
  value numeric NOT NULL,
  unit text NOT NULL,
  label text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.progress_entries TO authenticated;
GRANT ALL ON public.progress_entries TO service_role;
ALTER TABLE public.progress_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "progress_read_own" ON public.progress_entries FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "progress_insert_own" ON public.progress_entries FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "progress_update_own" ON public.progress_entries FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "progress_delete_own" ON public.progress_entries FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX progress_entries_user_date_idx ON public.progress_entries(user_id, entry_date DESC);

CREATE TYPE public.client_link_status AS ENUM ('pending', 'active', 'declined', 'ended');
CREATE TABLE public.professional_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL,
  client_id uuid,
  invite_email text NOT NULL,
  status public.client_link_status NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (professional_id, invite_email)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.professional_clients TO authenticated;
GRANT ALL ON public.professional_clients TO service_role;
ALTER TABLE public.professional_clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "links_read_participants" ON public.professional_clients FOR SELECT TO authenticated USING (auth.uid() = professional_id OR auth.uid() = client_id);
CREATE POLICY "professionals_create_links" ON public.professional_clients FOR INSERT TO authenticated WITH CHECK (auth.uid() = professional_id AND public.has_role(auth.uid(), 'professional'));
CREATE POLICY "participants_update_links" ON public.professional_clients FOR UPDATE TO authenticated USING (auth.uid() = professional_id OR auth.uid() = client_id) WITH CHECK (auth.uid() = professional_id OR auth.uid() = client_id);
CREATE POLICY "professionals_delete_links" ON public.professional_clients FOR DELETE TO authenticated USING (auth.uid() = professional_id);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER roles_updated_at BEFORE UPDATE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER user_data_updated_at BEFORE UPDATE ON public.user_data FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER progress_updated_at BEFORE UPDATE ON public.progress_entries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER links_updated_at BEFORE UPDATE ON public.professional_clients FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.raw_user_meta_data ->> 'full_name', ''), NEW.raw_user_meta_data ->> 'avatar_url');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();