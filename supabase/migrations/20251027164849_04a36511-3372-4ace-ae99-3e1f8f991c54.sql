-- Create a function to trigger embedding generation for new chat logs
CREATE OR REPLACE FUNCTION public.trigger_chat_embedding()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Call the edge function asynchronously using pg_net extension
  -- This will generate embeddings for the new chat message
  PERFORM
    net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/embed-chat-message',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
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

-- Create trigger on chat_logs table for INSERT
DROP TRIGGER IF EXISTS chat_logs_embedding_trigger ON public.chat_logs;

CREATE TRIGGER chat_logs_embedding_trigger
AFTER INSERT ON public.chat_logs
FOR EACH ROW
EXECUTE FUNCTION public.trigger_chat_embedding();

-- Set the configuration parameters needed by the trigger
-- Note: These should be set at the database level by the admin
-- ALTER DATABASE postgres SET app.settings.supabase_url = 'https://kbaazksvkvnafrwtmkcw.supabase.co';
-- ALTER DATABASE postgres SET app.settings.service_role_key = 'your-service-role-key';

COMMENT ON FUNCTION public.trigger_chat_embedding() IS 'Automatically triggers embedding generation for new chat log entries';
COMMENT ON TRIGGER chat_logs_embedding_trigger ON public.chat_logs IS 'Calls edge function to generate embeddings after chat log insert';
