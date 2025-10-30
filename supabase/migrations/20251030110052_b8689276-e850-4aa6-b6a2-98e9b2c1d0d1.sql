-- Enable RLS on content_feedback table
ALTER TABLE public.content_feedback ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can insert their own feedback
CREATE POLICY "Users can submit feedback"
ON public.content_feedback
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- No SELECT policy - admins will view in Supabase dashboard only