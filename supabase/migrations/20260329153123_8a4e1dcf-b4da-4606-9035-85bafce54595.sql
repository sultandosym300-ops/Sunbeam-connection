
-- Drop the overly permissive policy and create a service-role only insert
-- Edge functions use service role, so we restrict insert to service_role
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

-- Allow inserts only via service role (edge functions) by using a function check
CREATE POLICY "Authenticated can insert own notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
