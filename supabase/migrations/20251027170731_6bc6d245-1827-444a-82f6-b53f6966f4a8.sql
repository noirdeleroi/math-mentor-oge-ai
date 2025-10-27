-- Create or replace the trigger function that calls the embedding edge function
-- This version doesn't require authentication since the edge function is public
CREATE OR REPLACE FUNCTION public.trigger_chat_embedding()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  supabase_url TEXT := 'https://kbaazksvkvnafrwtmkcw.supabase.co';
BEGIN
  -- Call the edge function asynchronously using pg_net extension
  -- No authentication needed since verify_jwt = false for this function
  PERFORM
    net.http_post(
      url := supabase_url || '/functions/v1/embed-chat-message',
      headers := jsonb_build_object(
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'chat_log_id', NEW.id,
        'user_message', NEW.user_message,
        'response', NEW.response
      )
    );
  
  RETURN NEW;
END;
$$;

-- Drop and recreate the trigger
DROP TRIGGER IF EXISTS chat_logs_embedding_trigger ON public.chat_logs;

CREATE TRIGGER chat_logs_embedding_trigger
AFTER INSERT ON public.chat_logs
FOR EACH ROW
EXECUTE FUNCTION public.trigger_chat_embedding();

COMMENT ON FUNCTION public.trigger_chat_embedding() IS 'Automatically triggers embedding generation for new chat messages using OpenAI text-embedding-3-small (1536 dimensions)';
COMMENT ON TRIGGER chat_logs_embedding_trigger ON public.chat_logs IS 'Auto-generates embeddings for embedded_user and embedded_response columns on insert';