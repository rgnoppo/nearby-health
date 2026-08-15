-- Migration for smart clinic ordering and randomized shuffle

-- 1. Function: reorder_clinic_smart
-- Shifts existing clinics automatically when an order number is assigned or changed,
-- ensuring consecutive sequential ordering (1..N) without duplicate collision.
CREATE OR REPLACE FUNCTION public.reorder_clinic_smart(
  target_clinic_id uuid,
  new_order int
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_list uuid[];
  total_count int;
  adjusted_order int;
  i int;
BEGIN
  -- Gather all clinic IDs in their current sort_order
  SELECT coalesce(array_agg(id ORDER BY sort_order ASC, created_at ASC), '{}'::uuid[])
  INTO current_list
  FROM public.clinics;

  total_count := cardinality(current_list);
  IF total_count IS NULL OR total_count = 0 THEN
    RETURN;
  END IF;

  -- Remove target_clinic_id from the current list if present
  current_list := array_remove(current_list, target_clinic_id);

  -- Determine total length after placing the target
  total_count := cardinality(current_list) + 1;

  -- Clamp new_order to valid range [1, total_count]
  adjusted_order := GREATEST(1, LEAST(coalesce(new_order, total_count), total_count));

  -- Insert target_clinic_id at the requested 1-indexed position
  IF adjusted_order = 1 THEN
    current_list := array_prepend(target_clinic_id, current_list);
  ELSIF adjusted_order > cardinality(current_list) THEN
    current_list := array_append(current_list, target_clinic_id);
  ELSE
    current_list := current_list[1:adjusted_order-1] || target_clinic_id || current_list[adjusted_order:cardinality(current_list)];
  END IF;

  -- Resequence sort_order consecutively from 1 to N
  FOR i IN 1..cardinality(current_list) LOOP
    UPDATE public.clinics
    SET sort_order = i, updated_at = now()
    WHERE id = current_list[i];
  END LOOP;
END;
$$;

-- 2. Function: randomize_clinics_order
-- Randomly shuffles all clinics (Random Shuffle) and assigns clean sequential sort orders (1..N)
CREATE OR REPLACE FUNCTION public.randomize_clinics_order()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  shuffled_ids uuid[];
  i int;
BEGIN
  -- Gather all clinic IDs in random order
  SELECT coalesce(array_agg(id ORDER BY random()), '{}'::uuid[])
  INTO shuffled_ids
  FROM public.clinics;

  IF shuffled_ids IS NULL OR cardinality(shuffled_ids) = 0 THEN
    RETURN;
  END IF;

  -- Resequence sort_order consecutively from 1 to N
  FOR i IN 1..cardinality(shuffled_ids) LOOP
    UPDATE public.clinics
    SET sort_order = i, updated_at = now()
    WHERE id = shuffled_ids[i];
  END LOOP;
END;
$$;

-- 3. Function: resequence_clinics
-- Re-sequences clinics based on an explicit array of clinic IDs
CREATE OR REPLACE FUNCTION public.resequence_clinics(
  clinic_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  i int;
BEGIN
  IF clinic_ids IS NULL OR cardinality(clinic_ids) = 0 THEN
    RETURN;
  END IF;

  FOR i IN 1..cardinality(clinic_ids) LOOP
    UPDATE public.clinics
    SET sort_order = i, updated_at = now()
    WHERE id = clinic_ids[i];
  END LOOP;
END;
$$;

-- Permissions
GRANT EXECUTE ON FUNCTION public.reorder_clinic_smart(uuid, int) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.randomize_clinics_order() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.resequence_clinics(uuid[]) TO authenticated, service_role;
