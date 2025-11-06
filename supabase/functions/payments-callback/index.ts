import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// MD5 hash function
// TODO: Replace with proper MD5 library for production
// Recommended: https://deno.land/x/md5@v1.0.0/mod.ts
async function md5Hash(input: string): Promise<string> {
  // Placeholder - replace with proper MD5
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hash));
  // This is SHA-256 truncated - NOT real MD5
  // TODO: Install and use: import { md5 } from "https://deno.land/x/md5@v1.0.0/mod.ts";
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase().substring(0, 32);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body - Robokassa sends form-encoded data, mock sends JSON
    const payload: Record<string, string> = {};
    const contentType = req.headers.get('content-type') || '';
    
    if (contentType.includes('application/x-www-form-urlencoded')) {
      // Form-encoded (Robokassa)
      const formData = await req.formData();
      for (const [key, value] of formData.entries()) {
        payload[key] = value.toString();
      }
    } else if (contentType.includes('application/json')) {
      // JSON (mock provider)
      const jsonData = await req.json();
      Object.assign(payload, jsonData);
    } else {
      // Try to parse as form data first (most common for payment callbacks)
      try {
        const formData = await req.formData();
        for (const [key, value] of formData.entries()) {
          payload[key] = value.toString();
        }
      } catch {
        // If form data fails, try as URL-encoded string
        const text = await req.text();
        try {
          const params = new URLSearchParams(text);
          for (const [key, value] of params.entries()) {
            payload[key] = value;
          }
        } catch {
          // Last resort: try JSON
          try {
            const jsonData = JSON.parse(text);
            Object.assign(payload, jsonData);
          } catch {
            throw new Error('Unable to parse request body');
          }
        }
      }
    }

    const {
      OutSum,
      InvId,
      CustomerNumber,
      ShpCourseId,
      ShpPromocode,
      Signature,
    } = payload;

    // Validate required fields
    if (!OutSum || !InvId || !CustomerNumber || !Signature) {
      return new Response(
        JSON.stringify({ error: 'Missing required payment fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get payment provider
    const paymentProvider = Deno.env.get('PAYMENT_PROVIDER') || 'mock';
    let isValid = false;

    if (paymentProvider === 'robokassa') {
      // Verify Robokassa signature
      const password2 = Deno.env.get('ROBO_PASSWORD2') || '';
      if (!password2) {
        throw new Error('Robokassa callback password not configured');
      }

      const signatureParts = [OutSum, InvId, password2];
      const customParams: string[] = [];
      if (ShpCourseId) customParams.push(`ShpCourseId=${ShpCourseId}`);
      if (ShpPromocode) customParams.push(`ShpPromocode=${ShpPromocode}`);
      customParams.sort();

      const signatureString = [
        ...signatureParts,
        ...customParams.map(p => p.split('=')[1]),
      ].join(':');

      const expectedSignature = await md5Hash(signatureString);

      // TODO: Verify payment status field if present (e.g., StateCode === '5')
      isValid = Signature.toUpperCase() === expectedSignature;
    } else {
      // Mock: verify signature
      const secret = Deno.env.get('MOCK_PAYMENT_SECRET') || 'mock-secret-key';
      const signatureParts = [
        OutSum,
        InvId,
        CustomerNumber,
        ShpCourseId || '',
        ShpPromocode || '',
        secret,
      ];
      const expectedSignature = await md5Hash(signatureParts.join(':'));
      isValid = Signature.toUpperCase() === expectedSignature;
    }

    if (!isValid) {
      return new Response(
        JSON.stringify({ error: 'Invalid payment signature' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse payment data
    const paid = parseFloat(OutSum);
    const userId = CustomerNumber;
    const courseId = ShpCourseId || undefined;
    const promocode = ShpPromocode || undefined;
    const externalInvoiceId = InvId;

    // Check if subscription already exists (idempotency)
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('external_invoice_id', externalInvoiceId)
      .maybeSingle();

    if (existing) {
      // Already processed
      return new Response(
        JSON.stringify({ success: true, message: 'Payment already processed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate dates
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);

    // Insert subscription
    const { error } = await supabase
      .from('subscriptions')
      .insert({
        user_id: userId,
        course_id: courseId || null,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        is_active: true,
        paid: paid,
        promocode: promocode || null,
        promo_applied: promocode ? true : false,
        external_invoice_id: externalInvoiceId,
      });

    if (error) {
      console.error('Error creating subscription:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to create subscription' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return success (Robokassa expects "OK" + invoice ID)
    return new Response(
      `OK${InvId}`,
      { headers: { ...corsHeaders, 'Content-Type': 'text/plain' } }
    );
  } catch (error) {
    console.error('Error processing payment callback:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

