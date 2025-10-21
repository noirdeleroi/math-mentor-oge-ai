-- Create student_essay1 table
CREATE TABLE public.student_essay1 (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  essay_topic_id UUID NOT NULL REFERENCES public.essay_topics(id),
  text_scan TEXT,
  analysis TEXT,
  score INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.student_essay1 ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own essays" 
ON public.student_essay1 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own essays" 
ON public.student_essay1 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own essays" 
ON public.student_essay1 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own essays" 
ON public.student_essay1 
FOR DELETE 
USING (auth.uid() = user_id);