import { supabase } from '@/lib/supabase';
import { CallbackResult } from './types';

/**
 * Upsert subscription from payment callback result
 * Idempotent: uses external_invoice_id to prevent duplicates
 */
export async function upsertSubscription(result: CallbackResult): Promise<void> {
  const { externalInvoiceId, paid, userId, courseId, promocode } = result;

  // Calculate end date (30 days from now)
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 30);

  // Check if subscription with this invoice ID already exists
  const { data: existing } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('external_invoice_id', externalInvoiceId)
    .maybeSingle();

  if (existing) {
    // Already processed - idempotent
    console.log(`Subscription ${externalInvoiceId} already exists, skipping`);
    return;
  }

  // Insert new subscription
  const { error } = await supabase
    .from('subscriptions')
    .insert({
      user_id: userId,
      course_id: courseId || null,
      start_date: startDate.toISOString().split('T')[0], // YYYY-MM-DD
      end_date: endDate.toISOString().split('T')[0],
      is_active: true,
      paid: paid,
      promocode: promocode || null,
      promo_applied: promocode ? true : false,
      external_invoice_id: externalInvoiceId,
    });

  if (error) {
    throw new Error(`Failed to create subscription: ${error.message}`);
  }
}

/**
 * Get latest active subscription for a user
 */
export async function getLatestSubscription(userId: string) {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch subscription: ${error.message}`);
  }

  return data;
}

