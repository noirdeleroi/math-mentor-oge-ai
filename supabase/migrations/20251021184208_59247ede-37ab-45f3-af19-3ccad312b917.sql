-- Create essay_topics table
CREATE TABLE public.essay_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  essay_topic TEXT NOT NULL,
  rules TEXT
);

-- Enable Row Level Security
ALTER TABLE public.essay_topics ENABLE ROW LEVEL SECURITY;

-- Allow public read access to essay topics
CREATE POLICY "Essay topics are viewable by everyone"
ON public.essay_topics
FOR SELECT
USING (true);