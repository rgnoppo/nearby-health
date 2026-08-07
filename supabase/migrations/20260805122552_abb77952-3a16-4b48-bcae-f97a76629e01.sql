CREATE TYPE public.app_role AS ENUM ('admin');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE TABLE public.clinics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  specialty text,
  address text NOT NULL,
  landmark text NOT NULL,
  phone text NOT NULL,
  whatsapp text,
  working_hours text NOT NULL,
  notes text,
  map_url text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.clinics TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinics TO authenticated;
GRANT ALL ON public.clinics TO service_role;
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clinics are public" ON public.clinics FOR SELECT USING (true);
CREATE POLICY "Admins manage clinics" ON public.clinics FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  stars smallint NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment text,
  author_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ratings_clinic_id_idx ON public.ratings(clinic_id);
GRANT SELECT, INSERT ON public.ratings TO anon;
GRANT SELECT, INSERT, DELETE ON public.ratings TO authenticated;
GRANT ALL ON public.ratings TO service_role;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ratings are public" ON public.ratings FOR SELECT USING (true);
CREATE POLICY "Anyone can rate" ON public.ratings FOR INSERT WITH CHECK (
  stars BETWEEN 1 AND 5 AND char_length(coalesce(comment, '')) <= 1000 AND char_length(coalesce(author_name, '')) <= 80
);
CREATE POLICY "Admins delete ratings" ON public.ratings FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text NOT NULL,
  landmark text NOT NULL,
  phone text NOT NULL,
  specialty text,
  whatsapp text,
  working_hours text,
  notes text,
  submitter_note text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.suggestions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suggestions TO authenticated;
GRANT ALL ON public.suggestions TO service_role;
ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can suggest" ON public.suggestions FOR INSERT WITH CHECK (status = 'pending');
CREATE POLICY "Admins read suggestions" ON public.suggestions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update suggestions" ON public.suggestions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete suggestions" ON public.suggestions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER clinics_set_updated_at BEFORE UPDATE ON public.clinics FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.clinics (name, specialty, address, landmark, phone, whatsapp, working_hours, notes, sort_order) VALUES
('Nile Family Clinic', 'General & Family Medicine', '12 El Horreya St, Heliopolis, Cairo', 'Directly beside the blue-domed pharmacy', '+20 2 2417 5580', '+20 100 555 1204', 'Sat–Thu 10:00–22:00 · Fri closed', 'Walk-ins accepted until 21:00.', 1),
('Bright Smile Dental Center', 'Dentistry & Orthodontics', '45 Makram Ebeid St, Nasr City, Cairo', 'Above the corner bakery with the red awning', '+20 2 2270 9931', '+20 101 224 7788', 'Sun–Thu 12:00–21:00 · Sat 12:00–17:00', 'Book ahead for orthodontic visits.', 2),
('El Salam Pediatrics', 'Pediatrics', '8 Gamal El Din St, Dokki, Giza', 'Facing the small green playground', '+20 2 3762 1188', NULL, 'Daily 09:00–20:00', 'Vaccinations every Monday morning.', 3),
('Cairo Eye & Vision', 'Ophthalmology', '30 Shehab St, Mohandessin, Giza', 'Next to the old cinema entrance', '+20 2 3305 4412', '+20 122 908 3345', 'Sat–Wed 11:00–20:00', NULL, 4);

INSERT INTO public.ratings (clinic_id, stars, comment, author_name)
SELECT id, 5, 'Very short wait and the doctor explained everything clearly.', 'Mona' FROM public.clinics WHERE name = 'Nile Family Clinic';
INSERT INTO public.ratings (clinic_id, stars, comment, author_name)
SELECT id, 4, 'Clean place, easy to find using the bakery landmark.', 'Ahmed' FROM public.clinics WHERE name = 'Bright Smile Dental Center';