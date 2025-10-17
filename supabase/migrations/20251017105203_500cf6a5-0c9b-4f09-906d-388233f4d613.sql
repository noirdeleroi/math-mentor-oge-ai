-- Create pending_homework_feedback table for multi-course feedback queue
CREATE TABLE pending_homework_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('homework', 'textbook_exercise')),
  homework_name TEXT,
  context_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processing_started_at TIMESTAMPTZ,
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  feedback_message TEXT,
  error_message TEXT
);

-- Create indexes for efficient querying
CREATE INDEX idx_pending_feedback_user_processed ON pending_homework_feedback(user_id, processed, course_id);
CREATE INDEX idx_pending_feedback_created ON pending_homework_feedback(created_at);

-- Enable RLS
ALTER TABLE pending_homework_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can insert their own feedback records"
  ON pending_homework_feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own feedback records"
  ON pending_homework_feedback
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own feedback records"
  ON pending_homework_feedback
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);