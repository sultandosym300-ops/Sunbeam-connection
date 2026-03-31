
-- Task applications table
CREATE TABLE public.task_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  volunteer_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  photo_url text,
  ai_verdict text,
  ai_comment text,
  match_score float,
  match_explanation text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(task_id, volunteer_id)
);

ALTER TABLE public.task_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Volunteers can apply to tasks"
  ON public.task_applications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = volunteer_id);

CREATE POLICY "Users can view relevant applications"
  ON public.task_applications FOR SELECT TO authenticated
  USING (
    auth.uid() = volunteer_id 
    OR task_id IN (SELECT id FROM public.tasks WHERE organization_id = auth.uid())
  );

CREATE POLICY "Volunteers can update own applications"
  ON public.task_applications FOR UPDATE TO authenticated
  USING (auth.uid() = volunteer_id);

CREATE POLICY "Org can update task applications"
  ON public.task_applications FOR UPDATE TO authenticated
  USING (task_id IN (SELECT id FROM public.tasks WHERE organization_id = auth.uid()));

-- Storage bucket for photo reports
INSERT INTO storage.buckets (id, name, public) VALUES ('photo-reports', 'photo-reports', true);

CREATE POLICY "Authenticated users can upload photo reports"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'photo-reports');

CREATE POLICY "Anyone can view photo reports"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'photo-reports');

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_applications;
