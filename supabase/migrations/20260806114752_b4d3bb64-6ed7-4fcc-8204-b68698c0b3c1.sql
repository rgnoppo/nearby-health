DROP TABLE IF EXISTS public.ratings CASCADE;

CREATE TABLE public.categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  icon text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX categories_name_key ON public.categories (lower(name));

GRANT SELECT ON public.categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categories are public" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Admins manage categories" ON public.categories FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER categories_set_updated_at BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE public.clinics
  ADD COLUMN category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL;

ALTER TABLE public.suggestions
  ADD COLUMN category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL;

INSERT INTO public.categories (name, sort_order) VALUES
  ('باطنة', 1),
  ('أطفال', 2),
  ('أسنان', 3),
  ('عظام', 4),
  ('جلدية', 5),
  ('نسا وتوليد', 6),
  ('عيون', 7),
  ('أنف وأذن', 8),
  ('قلب', 9),
  ('تحاليل وأشعة', 10);