import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! }, 
        },
      }
    );

    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
    if (!OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY is not configured');
    }

    const { user_id, images, question_id } = await req.json();

    // Validate inputs
    if (!user_id || !images || !Array.isArray(images) || images.length === 0 || images.length > 3) {
      return new Response(
        JSON.stringify({ error: 'Недействительные данные. Загрузите от 1 до 3 фото.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const extractedLatexArray: string[] = [];

    // Process each image sequentially
    for (let i = 0; i < images.length; i++) {
      const imageBase64 = images[i];
      const imageIndex = i + 1;

      console.log(`Processing image ${imageIndex} of ${images.length}`);

      // Generate new UUID for problem_submission_id
      const problem_submission_id = crypto.randomUUID();

      // Insert into telegram_uploads
      const { error: insertError } = await supabaseClient
        .from('telegram_uploads')
        .insert({
          telegram_user_id: 0,
          telegram_upload_content: imageBase64,
          problem_submission_id: problem_submission_id,
          extracted_text: null,
          user_id: user_id
        });

      if (insertError) {
        console.error('Error inserting into telegram_uploads:', insertError);
        return new Response(
          JSON.stringify({ error: 'Произошла ошибка при сохранении фото. Пожалуйста, попробуйте снова.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Call OpenRouter API to OCR the image
      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            temperature: 0,
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: 'Convert this Math text in Russian into raw LaTeX. **IMPORTANT**: the text should be without preambule.'
                  },
                  {
                    type: 'image_url',
                    image_url: {
                      url: imageBase64
                    }
                  }
                ]
              }
            ]
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`OpenRouter API error for image ${imageIndex}:`, response.status, errorText);
          return new Response(
            JSON.stringify({ error: 'Произошла ошибка при обработке. Пожалуйста, попробуйте снова.' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const data = await response.json();
        const extractedLatex = data.choices[0].message.content;

        // Track API usage
        const tokensIn = data.usage?.prompt_tokens || 0;
        const tokensOut = data.usage?.completion_tokens || 0;
        const modelPricing = {
          'google/gemini-2.5-flash': { input: 0.000125 / 1000, output: 0.0005 / 1000 }
        };
        const pricing = modelPricing['google/gemini-2.5-flash'];
        const cost = (tokensIn * pricing.input + tokensOut * pricing.output).toFixed(6);

        await supabaseClient
          .from('user_credits')
          .insert({
            user_id: user_id,
            tokens_in: tokensIn.toString(),
            tokens_out: tokensOut.toString(),
            price: cost
          });

        // Update telegram_uploads with extracted text
        const { error: updateError } = await supabaseClient
          .from('telegram_uploads')
          .update({ extracted_text: extractedLatex })
          .eq('problem_submission_id', problem_submission_id);

        if (updateError) {
          console.error('Error updating extracted_text:', updateError);
        }

        extractedLatexArray.push(extractedLatex);
        console.log(`Successfully processed image ${imageIndex}`);

      } catch (apiError) {
        console.error(`Error calling OpenRouter API for image ${imageIndex}:`, apiError);
        return new Response(
          JSON.stringify({ error: 'Произошла ошибка при обработке. Пожалуйста, попробуйте снова.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Concatenate all extracted LaTeX
    const concatenatedLatex = extractedLatexArray.join('\n\n');

    // Update profiles.telegram_input
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .update({ telegram_input: concatenatedLatex })
      .eq('user_id', user_id);

    if (profileError) {
      console.error('Error updating profiles.telegram_input:', profileError);
      return new Response(
        JSON.stringify({ error: 'Произошла ошибка при сохранении данных. Пожалуйста, попробуйте снова.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully processed all images and updated profile');

    return new Response(
      JSON.stringify({ success: true, latex: concatenatedLatex }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in process-device-photos:', error);
    return new Response(
      JSON.stringify({ error: 'Произошла ошибка при обработке. Пожалуйста, попробуйте снова.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
