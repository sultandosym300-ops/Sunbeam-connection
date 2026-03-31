CREATE OR REPLACE FUNCTION public.close_expired_tasks()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  affected integer;
BEGIN
  UPDATE tasks
  SET status = 'expired', updated_at = now()
  WHERE status = 'open'
    AND date IS NOT NULL
    AND date < CURRENT_DATE;
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;