-- Create subscriptions table for payment tracking
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id TEXT,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  paid DECIMAL(10, 2) NOT NULL,
  promocode TEXT,
  promo_applied BOOLEAN NOT NULL DEFAULT false,
  external_invoice_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own subscriptions"
ON public.subscriptions
FOR SELECT
USING (auth.uid() = user_id);

-- Service role can insert/update (for payment callbacks)
-- Note: In production, use a service role key in Edge Functions
CREATE POLICY "Service can manage subscriptions"
ON public.subscriptions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create unique index on external_invoice_id for idempotency
-- This prevents duplicate subscriptions from the same payment
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_external_invoice_id 
ON public.subscriptions(external_invoice_id);

-- Create index for efficient user subscription queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id 
ON public.subscriptions(user_id, is_active, end_date DESC);

-- Create index for course-based queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_course_id 
ON public.subscriptions(course_id) WHERE course_id IS NOT NULL;

