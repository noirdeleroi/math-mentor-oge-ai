import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// MD5 hash using crypto library
// TODO: Replace with official Robokassa MD5 library for production
// For now, using a simple hash - replace with proper MD5 implementation
// Recommended: https://deno.land/x/md5@v1.0.0/mod.ts
async function md5Hash(input: string): Promise<string> {
  // Placeholder implementation - replace with proper MD5
  // Web Crypto API doesn't support MD5, so use an MD5 library
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hash));
  // This is SHA-256 truncated to 32 chars - NOT real MD5
  // TODO: Install and use: import { md5 } from "https://deno.land/x/md5@v1.0.0/mod.ts";
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase().substring(0, 32);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Get auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { courseId, amount, promocode } = await req.json();

    if (!amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid amount' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get payment provider
    const paymentProvider = Deno.env.get('PAYMENT_PROVIDER') || 'mock';
    const baseUrl = Deno.env.get('BASE_URL') || 'http://localhost:5173';

    let redirectUrl: string;
    let externalInvoiceId: string;

    if (paymentProvider === 'robokassa') {
      // Robokassa implementation
      const login = Deno.env.get('ROBO_LOGIN') || '';
      const password1 = Deno.env.get('ROBO_PASSWORD1') || '';
      const robokassaUrl = Deno.env.get('ROBOKASSA_BASE_URL') || 'https://auth.robokassa.ru/Merchant/Index.aspx';
      const isTestMode = Deno.env.get('ROBOKASSA_TEST_MODE') === 'true';

      if (!login || !password1) {
        throw new Error('Robokassa not configured');
      }

      externalInvoiceId = `ROBO-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      // Build signature (TODO: match official Robokassa docs)
      const signatureParts = [login, amount.toString(), externalInvoiceId, password1];
      const customParams: string[] = [];
      if (courseId) customParams.push(`ShpCourseId=${courseId}`);
      if (promocode) customParams.push(`ShpPromocode=${promocode}`);
      customParams.sort();

      const signatureString = [
        ...signatureParts,
        ...customParams.map(p => p.split('=')[1]),
      ].join(':');

      const signature = await md5Hash(signatureString);

      const params = new URLSearchParams({
        MerchantLogin: login,
        OutSum: amount.toString(),
        InvId: externalInvoiceId,
        Description: `Subscription${courseId ? ` - Course ${courseId}` : ''}`,
        SignatureValue: signature,
        CustomerNumber: user.id,
        ...(isTestMode && { IsTest: '1' }),
        ...(courseId && { ShpCourseId: courseId }),
        ...(promocode && { ShpPromocode: promocode }),
      });

      redirectUrl = `${robokassaUrl}?${params.toString()}`;
    } else {
      // Mock implementation
      externalInvoiceId = `MOCK-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const params = new URLSearchParams({
        InvId: externalInvoiceId,
        CustomerNumber: user.id,
        OutSum: amount.toString(),
        ...(courseId && { ShpCourseId: courseId }),
        ...(promocode && { ShpPromocode: promocode }),
      });
      redirectUrl = `${baseUrl}/checkout/mock?${params.toString()}`;
    }

    return new Response(
      JSON.stringify({ redirectUrl, externalInvoiceId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating payment:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

