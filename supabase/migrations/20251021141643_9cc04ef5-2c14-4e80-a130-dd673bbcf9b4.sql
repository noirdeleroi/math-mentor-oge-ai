-- Create the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create rus_essay_topics table for storing essay topics
CREATE TABLE IF NOT EXISTS public.rus_essay_topics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject TEXT NOT NULL CHECK (subject IN ('ege', 'oge')),
  essay_topic TEXT NOT NULL,
  rules TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rus_essay_topics ENABLE ROW LEVEL SECURITY;

-- Everyone can read essay topics
CREATE POLICY "Essay topics are viewable by everyone" 
ON public.rus_essay_topics 
FOR SELECT 
USING (true);

-- Create student_essay table for storing student essays
CREATE TABLE IF NOT EXISTS public.student_essay (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  essay_topic_id UUID NOT NULL REFERENCES public.rus_essay_topics(id) ON DELETE CASCADE,
  text_scan TEXT,
  analysis TEXT,
  score INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.student_essay ENABLE ROW LEVEL SECURITY;

-- Users can view their own essays
CREATE POLICY "Users can view their own essays" 
ON public.student_essay 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can create their own essays
CREATE POLICY "Users can create their own essays" 
ON public.student_essay 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own essays
CREATE POLICY "Users can update their own essays" 
ON public.student_essay 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Users can delete their own essays
CREATE POLICY "Users can delete their own essays" 
ON public.student_essay 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_student_essay_updated_at
BEFORE UPDATE ON public.student_essay
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for faster queries
CREATE INDEX idx_student_essay_user_id ON public.student_essay(user_id);
CREATE INDEX idx_student_essay_topic_id ON public.student_essay(essay_topic_id);