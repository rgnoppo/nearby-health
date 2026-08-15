-- Enable pg_trgm extension for fuzzy string matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Function to normalize Arabic characters to handle common Egyptian spelling variations:
-- 1. Unify Alif variants (أ / إ / آ / ٱ) -> ا
-- 2. Unify Ta Marbuta and Haa (ة) -> ه
-- 3. Unify Alif Maqsura and Yaa (ى) -> ي
-- 4. Strip Arabic diacritics / Harakat / Tashkeel & Tatweel (Kashida)
-- 5. Normalize whitespace and case
CREATE OR REPLACE FUNCTION public.normalize_arabic(input_text text)
RETURNS text
LANGUAGE sql
IMMUTABLE
STRICT
PARALLEL SAFE
AS $$
  SELECT trim(
    regexp_replace(
      translate(
        regexp_replace(
          lower(input_text),
          '[ًٌٍَُِّْـٰ]',
          '',
          'g'
        ),
        'أإآٱةى',
        'ااااهي'
      ),
      '\s+',
      ' ',
      'g'
    )
  );
$$;

-- GIN Trigram expression indexes for high-performance fuzzy & substring matching
CREATE INDEX IF NOT EXISTS clinics_name_trgm_idx
  ON public.clinics USING gin (public.normalize_arabic(name) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS clinics_specialty_trgm_idx
  ON public.clinics USING gin (public.normalize_arabic(coalesce(specialty, '')) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS clinics_landmark_trgm_idx
  ON public.clinics USING gin (public.normalize_arabic(landmark) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS clinics_address_trgm_idx
  ON public.clinics USING gin (public.normalize_arabic(address) gin_trgm_ops);

-- RPC function: search_clinics_fuzzy
-- Accepts search_query (and optional filter_category_id)
-- Normalizes search query and target texts, performs ILIKE + pg_trgm similarity matching,
-- and orders results by relevance (similarity + exact/prefix match weights)
CREATE OR REPLACE FUNCTION public.search_clinics_fuzzy(
  search_query text DEFAULT '',
  filter_category_id uuid DEFAULT NULL
)
RETURNS SETOF public.clinics
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  norm_q text;
BEGIN
  norm_q := public.normalize_arabic(search_query);

  -- If empty query, return normal listing ordered by sort_order
  IF norm_q IS NULL OR norm_q = '' THEN
    IF filter_category_id IS NOT NULL THEN
      RETURN QUERY
        SELECT c.*
        FROM public.clinics c
        WHERE c.category_id = filter_category_id
        ORDER BY c.sort_order ASC, c.created_at ASC;
    ELSE
      RETURN QUERY
        SELECT c.*
        FROM public.clinics c
        ORDER BY c.sort_order ASC, c.created_at ASC;
    END IF;
    RETURN;
  END IF;

  RETURN QUERY
    WITH scored AS (
      SELECT
        c.id,
        (
          -- Exact / Prefix match bonuses on clinic name
          (CASE WHEN public.normalize_arabic(c.name) = norm_q THEN 10.0 ELSE 0.0 END) +
          (CASE WHEN public.normalize_arabic(c.name) LIKE (norm_q || '%') THEN 6.0 ELSE 0.0 END) +
          (CASE WHEN public.normalize_arabic(c.name) LIKE ('%' || norm_q || '%') THEN 4.0 ELSE 0.0 END) +
          -- Substring matches on specialty, category, landmark, address, notes
          (CASE WHEN public.normalize_arabic(coalesce(c.specialty, '')) LIKE ('%' || norm_q || '%') THEN 3.0 ELSE 0.0 END) +
          (CASE WHEN public.normalize_arabic(coalesce(cat.name, '')) LIKE ('%' || norm_q || '%') THEN 3.0 ELSE 0.0 END) +
          (CASE WHEN public.normalize_arabic(coalesce(c.landmark, '')) LIKE ('%' || norm_q || '%') THEN 2.0 ELSE 0.0 END) +
          (CASE WHEN public.normalize_arabic(coalesce(c.address, '')) LIKE ('%' || norm_q || '%') THEN 1.5 ELSE 0.0 END) +
          (CASE WHEN public.normalize_arabic(coalesce(c.notes, '')) LIKE ('%' || norm_q || '%') THEN 0.5 ELSE 0.0 END) +
          -- Fuzzy trigram similarity scoring (pg_trgm)
          (similarity(public.normalize_arabic(c.name), norm_q) * 4.0) +
          (word_similarity(norm_q, public.normalize_arabic(c.name)) * 3.0) +
          (word_similarity(norm_q, public.normalize_arabic(coalesce(c.specialty, ''))) * 2.5) +
          (word_similarity(norm_q, public.normalize_arabic(coalesce(cat.name, ''))) * 2.5) +
          (word_similarity(norm_q, public.normalize_arabic(coalesce(c.landmark, ''))) * 1.5) +
          (word_similarity(norm_q, public.normalize_arabic(coalesce(c.address, ''))) * 1.0)
        ) AS match_score
      FROM public.clinics c
      LEFT JOIN public.categories cat ON cat.id = c.category_id
      WHERE
        (filter_category_id IS NULL OR c.category_id = filter_category_id)
        AND (
          -- Exact substring match (normalized)
          public.normalize_arabic(c.name) LIKE ('%' || norm_q || '%')
          OR public.normalize_arabic(coalesce(c.specialty, '')) LIKE ('%' || norm_q || '%')
          OR public.normalize_arabic(coalesce(cat.name, '')) LIKE ('%' || norm_q || '%')
          OR public.normalize_arabic(coalesce(c.landmark, '')) LIKE ('%' || norm_q || '%')
          OR public.normalize_arabic(coalesce(c.address, '')) LIKE ('%' || norm_q || '%')
          OR public.normalize_arabic(coalesce(c.notes, '')) LIKE ('%' || norm_q || '%')
          -- Fuzzy trigram match for typos, letter drops, and phonetics
          OR similarity(public.normalize_arabic(c.name), norm_q) > 0.25
          OR word_similarity(norm_q, public.normalize_arabic(c.name)) > 0.35
          OR word_similarity(norm_q, public.normalize_arabic(coalesce(c.specialty, ''))) > 0.35
          OR word_similarity(norm_q, public.normalize_arabic(coalesce(cat.name, ''))) > 0.35
          OR word_similarity(norm_q, public.normalize_arabic(coalesce(c.landmark, ''))) > 0.35
          OR word_similarity(norm_q, public.normalize_arabic(coalesce(c.address, ''))) > 0.35
        )
    )
    SELECT c.*
    FROM scored s
    JOIN public.clinics c ON c.id = s.id
    ORDER BY s.match_score DESC, c.sort_order ASC, c.created_at ASC;
END;
$$;

-- Allow anonymous and authenticated access to the search & normalize functions
GRANT EXECUTE ON FUNCTION public.normalize_arabic(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.search_clinics_fuzzy(text, uuid) TO anon, authenticated, service_role;
