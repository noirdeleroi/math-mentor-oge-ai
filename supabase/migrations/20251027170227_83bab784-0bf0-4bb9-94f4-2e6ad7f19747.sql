-- Enable pg_net extension for making HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create or replace the trigger function that calls the embedding edge function
CREATE OR REPLACE FUNCTION public.trigger_chat_embedding()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  supabase_url TEXT := 'https://kbaazksvkvnafrwtmkcw.supabase.co';
  service_role_key TEXT;
BEGIN
  -- Get the service role key from Vault (if available) or environment
  -- Note: The service role key will be automatically available as an environment variable
  service_role_key := current_setting('app.settings.service_role_key', true);
  
  -- If not set in settings, try to get from environment (Supabase automatically provides this)
  IF service_role_key IS NULL THEN
    service_role_key := current_setting('request.jwt.claim.sub', true);
  END IF;
  
  -- Call the edge function asynchronously using pg_net extension
  PERFORM
    net.http_post(
      url := supabase_url || '/functions/v1/embed-chat-message',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || COALESCE(service_role_key, '')
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

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS chat_logs_embedding_trigger ON public.chat_logs;

-- Create trigger on chat_logs table for INSERT
CREATE TRIGGER chat_logs_embedding_trigger
AFTER INSERT ON public.chat_logs
FOR EACH ROW
EXECUTE FUNCTION public.trigger_chat_embedding();

COMMENT ON FUNCTION public.trigger_chat_embedding() IS 'Automatically triggers embedding generation for new chat log entries using OpenAI text-embedding-3-small model';
COMMENT ON TRIGGER chat_logs_embedding_trigger ON public.chat_logs IS 'Calls embed-chat-message edge function to generate 1536-dimensional embeddings after chat log insert';