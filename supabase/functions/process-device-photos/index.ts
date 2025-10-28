import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: {
        headers: {
          Authorization: req.headers.get('Authorization')
        }
      }
    });
    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
    if (!OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY is not configured');
    }
    const { user_id, images, question_id } = await req.json();
    // Validate inputs
    if (!user_id || !images || !Array.isArray(images) || images.length === 0 || images.length > 3) {
      return new Response(JSON.stringify({
        error: 'Недействительные данные. Загрузите от 1 до 3 фото.'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const extractedLatexArray = [];
    // Process each image sequentially
    for(let i = 0; i < images.length; i++){
      const imageBase64 = images[i];
      const imageIndex = i + 1;
      console.log(`Processing image ${imageIndex} of ${images.length}`);
      // Generate new UUID for problem_submission_id
      const problem_submission_id = crypto.randomUUID();
      // Insert into telegram_uploads
      const { error: insertError } = await supabaseClient.from('telegram_uploads').insert({
        telegram_user_id: 0,
        user_id: user_id,
        question_id: question_id,
        telegram_upload_content: imageBase64,
        problem_submission_id: problem_submission_id,
        extracted_text: null
      });
      if (insertError) {
        console.error('Error inserting into telegram_uploads:', insertError);
        return new Response(JSON.stringify({
          error: 'Произошла ошибка при сохранении фото. Пожалуйста, попробуйте снова.'
        }), {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
      // Call OpenRouter API to OCR the image
      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json'
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
                    text: 'Convert this Math text in Russian into MathJax compatible HTML. **IMPORTANT**: the text should be without preambule, never use "latex" or other wrappers, give just MathJax compatible HTML.'
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
          })
        });
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`OpenRouter API error for image ${imageIndex}:`, response.status, errorText);
          return new Response(JSON.stringify({
            error: 'Произошла ошибка при обработке. Пожалуйста, попробуйте снова.'
          }), {
            status: 500,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          });
        }
        const data = await response.json();
        const extractedLatex = data.choices[0].message.content;
        // Track API usage
        const tokensIn = data.usage?.prompt_tokens || 0;
        const tokensOut = data.usage?.completion_tokens || 0;
        const modelPricing = {
          'google/gemini-2.5-flash': {
            input: 0.000125 / 1000,
            output: 0.0005 / 1000
          }
        };
        const pricing = modelPricing['google/gemini-2.5-flash'];
        const cost = (tokensIn * pricing.input + tokensOut * pricing.output).toFixed(6);
        await supabaseClient.from('user_credits').insert({
          user_id: user_id,
          tokens_in: tokensIn.toString(),
          tokens_out: tokensOut.toString(),
          price: cost
        });
        // --- SECOND CALL: Convert LaTeX to MathJax-compatible HTML ---
        let mathjaxHTML = "";
        try {
          const htmlResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
              'Content-Type': 'application/json'
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
                      text: `Convert the following LaTeX text into MathJax-compatible HTML. 
                      Use <p> and <span> tags where needed. 
                      Inline math should be wrapped in \\( ... \\), and block math in $$ ... $$. 
                      Output only valid HTML (no markdown, no backticks, no LaTeX preamble). 
                      \n\n${extractedLatex}`
                    }
                  ]
                }
              ]
            })
          });
          if (!htmlResponse.ok) {
            const errorText = await htmlResponse.text();
            console.error(`Error converting LaTeX to HTML for image ${imageIndex}:`, htmlResponse.status, errorText);
          } else {
            const htmlData = await htmlResponse.json();
            mathjaxHTML = htmlData.choices[0].message.content;
            // === Extract token usage and calculate cost (for 2nd API call) ===
            const { prompt_tokens: html_prompt_tokens, completion_tokens: html_completion_tokens } = htmlData.usage || {};
            const html_model = htmlData.model || 'google/gemini-2.5-flash';
            const pricingTable = {
              "google/gemini-2.5-flash-lite-preview-09-2025": [
                0.30,
                2.50
              ],
              "google/gemini-2.5-flash-lite-preview-06-17": [
                0.10,
                0.40
              ],
              "google/gemini-2.5-flash-lite": [
                0.10,
                0.40
              ],
              "google/gemini-2.5-flash": [
                0.30,
                2.50
              ],
              "google/gemini-2.5-flash-preview-09-2025": [
                0.30,
                2.50
              ],
              "x-ai/grok-3-mini": [
                0.30,
                0.50
              ],
              "x-ai/grok-4-fast": [
                0.20,
                0.50
              ],
              "x-ai/grok-code-fast-1": [
                0.20,
                1.50
              ],
              "qwen/qwen3-coder-flash": [
                0.30,
                1.50
              ],
              "openai/o4-mini": [
                1.10,
                4.40
              ],
              "anthropic/claude-haiku-4.5": [
                1.00,
                5.00
              ]
            };
            // Get prices per million tokens
            const [priceIn, priceOut] = pricingTable[html_model] || [
              0,
              0
            ];
            const html_price = html_prompt_tokens / 1_000_000 * priceIn + html_completion_tokens / 1_000_000 * priceOut;
            // === Insert into Supabase user_credits table ===
            const { error: htmlCreditError } = await supabaseClient.from('user_credits').insert({
              user_id: user_id,
              tokens_in: html_prompt_tokens,
              tokens_out: html_completion_tokens,
              price: html_price
            });
            if (htmlCreditError) {
              console.error('❌ Failed to insert user credits (2nd call):', htmlCreditError.message);
            } else {
              console.log(`✅ Stored usage for 2nd call (${html_model}): ${html_prompt_tokens} in, ${html_completion_tokens} out, $${html_price.toFixed(6)} total`);
            }
          }
        } catch (htmlError) {
          console.error(`Error during MathJax conversion for image ${imageIndex}:`, htmlError);
        }
        // Update telegram_uploads with extracted text
        const { error: updateError } = await supabaseClient.from('telegram_uploads').update({
          extracted_text: mathjaxHTML
        }).eq('problem_submission_id', problem_submission_id);
        if (updateError) {
          console.error('Error updating extracted_text:', updateError);
        }
        extractedLatexArray.push(mathjaxHTML);
        console.log(`Successfully processed image ${imageIndex}`);
      } catch (apiError) {
        console.error(`Error calling OpenRouter API for image ${imageIndex}:`, apiError);
        return new Response(JSON.stringify({
          error: 'Произошла ошибка при обработке. Пожалуйста, попробуйте снова.'
        }), {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
    }
    // Concatenate all extracted LaTeX
    const concatenatedLatex = extractedLatexArray.join('\n\n');
    // Update profiles.telegram_input
    const { error: profileError } = await supabaseClient.from('profiles').update({
      telegram_input: concatenatedLatex
    }).eq('user_id', user_id);
    if (profileError) {
      console.error('Error updating profiles.telegram_input:', profileError);
      return new Response(JSON.stringify({
        error: 'Произошла ошибка при сохранении данных. Пожалуйста, попробуйте снова.'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    console.log('Successfully processed all images and updated profile');
    return new Response(JSON.stringify({
      success: true,
      latex: concatenatedLatex
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error in process-device-photos:', error);
    return new Response(JSON.stringify({
      error: 'Произошла ошибка при обработке. Пожалуйста, попробуйте снова.'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
