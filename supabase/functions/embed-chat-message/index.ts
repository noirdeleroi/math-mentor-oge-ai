import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { chat_log_id, user_message, response } = await req.json();

    if (!chat_log_id) {
      throw new Error('chat_log_id is required');
    }

    console.log(`Generating embeddings for chat_log_id: ${chat_log_id}`);

    // Generate embeddings for both user message and response
    const embeddingsToGenerate = [];
    if (user_message) embeddingsToGenerate.push(user_message);
    if (response) embeddingsToGenerate.push(response);

    if (embeddingsToGenerate.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No text to embed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call OpenAI embeddings API
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: embeddingsToGenerate,
        dimensions: 1536,
      }),
    });

    if (!embeddingResponse.ok) {
      const error = await embeddingResponse.text();
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI API error: ${error}`);
    }

    const embeddingData = await embeddingResponse.json();
    const embeddings = embeddingData.data.map((d: any) => d.embedding);

    // Update the chat_logs record with embeddings
    const updateData: any = {};
    if (user_message && embeddings[0]) {
      updateData.embedded_user = embeddings[0];
    }
    if (response && embeddings[user_message ? 1 : 0]) {
      updateData.embedded_response = embeddings[user_message ? 1 : 0];
    }

    const { error: updateError } = await supabase
      .from('chat_logs')
      .update(updateData)
      .eq('id', chat_log_id);

    if (updateError) {
      console.error('Error updating chat_logs:', updateError);
      throw updateError;
    }

    console.log(`Successfully embedded chat_log_id: ${chat_log_id}`);

    return new Response(
      JSON.stringify({ success: true, chat_log_id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in embed-chat-message:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
