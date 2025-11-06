# Payment Flow Implementation

## Overview

A realistic mock payment flow for `/subscribe` page that can be swapped to real **Robokassa** with minimal changes.

## Architecture

### Payment Provider Pattern

- **Location**: `src/lib/payments/`
- **Interface**: `PaymentProvider` with `createCheckout()` and `handleCallback()`
- **Implementations**:
  - `mock.ts` - Mock provider for testing
  - `robokassa.ts` - Robokassa provider (scaffolded with TODOs)

### Environment Variables

Set `PAYMENT_PROVIDER=mock|robokassa` to switch providers.

**For Mock:**
- `MOCK_PAYMENT_SECRET` (optional, defaults to 'mock-secret-key')
- `BASE_URL` (optional, defaults to current origin)

**For Robokassa:**
- `ROBO_LOGIN` - Robokassa merchant login
- `ROBO_PASSWORD1` - Password #1 (for payment URL signature)
- `ROBO_PASSWORD2` - Password #2 (for callback signature)
- `ROBOKASSA_BASE_URL` (optional, defaults to production URL)
- `ROBOKASSA_TEST_MODE` (optional, set to 'true' for test mode)

## API Routes (Supabase Edge Functions)

### `POST /functions/v1/payments-create`

Creates a payment checkout session.

**Request:**
```json
{
  "amount": 990,
  "courseId": "1",
  "promocode": "PROMO123"
}
```

**Response:**
```json
{
  "redirectUrl": "https://...",
  "externalInvoiceId": "MOCK-..."
}
```

### `POST /functions/v1/payments-callback`

Handles payment webhook/callback from payment gateway.

**Request (form-encoded for Robokassa, JSON for mock):**
- `OutSum` - Payment amount
- `InvId` - Invoice ID
- `CustomerNumber` - User ID
- `Signature` - Payment signature
- `ShpCourseId` - Course ID (optional)
- `ShpPromocode` - Promocode (optional)

**Response:**
- Success: `OK{InvId}` (text/plain)
- Error: JSON error object

## Database

### Table: `public.subscriptions`

```sql
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  course_id TEXT,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  paid DECIMAL(10, 2) NOT NULL,
  promocode TEXT,
  promo_applied BOOLEAN NOT NULL DEFAULT false,
  external_invoice_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
```

**Idempotency**: Unique index on `external_invoice_id` prevents duplicate subscriptions.

## Pages

### `/subscribe` - Subscription Page

- Displays subscription plans
- Payment form with amount, courseId, promocode inputs
- "TEST MODE" banner when using mock provider
- Calls `payments-create` API and redirects to payment gateway

### `/checkout/mock` - Mock Payment Gateway

- Fake payment gateway UI
- Collects payment details
- Generates mock signature
- POSTs to `payments-callback` API
- Redirects to `/subscribe/success` on success

### `/subscribe/success` - Success Page

- Displays subscription confirmation
- Fetches latest subscription from database
- Shows subscription details (dates, amount, course, promocode)

## Robokassa Integration Notes

### Signature Verification

**Current Status**: Placeholder MD5 implementation using SHA-256 truncated to 32 chars.

**TODO for Production**:
1. Install proper MD5 library: `https://deno.land/x/md5@v1.0.0/mod.ts`
2. Verify exact signature formula from [Robokassa docs](https://docs.robokassa.ru/)
3. Update signature generation in `robokassa.ts` and Edge Functions

### Signature Formula (Placeholder)

**Payment URL:**
```
MD5(Login:OutSum:InvId:Password1:ShpCourseId:ShpPromocode)
```

**Callback:**
```
MD5(OutSum:InvId:Password2:ShpCourseId:ShpPromocode)
```

**Note**: Custom parameters (Shp_*) must be sorted alphabetically.

### Status Verification

**TODO**: Add status field verification (e.g., `StateCode === '5'` for success).

## Testing

### Mock Flow

1. Navigate to `/subscribe`
2. Enter amount (e.g., 990)
3. Optionally enter courseId and promocode
4. Click "Выбрать Премиум"
5. Redirected to `/checkout/mock`
6. Confirm payment details
7. Click "Оплатить"
8. Redirected to `/subscribe/success`
9. Verify subscription in database

### Database Verification

```sql
SELECT * FROM public.subscriptions 
WHERE user_id = '<user-id>' 
ORDER BY created_at DESC 
LIMIT 1;
```

## Production Checklist

- [ ] Install proper MD5 library in Edge Functions
- [ ] Verify Robokassa signature formula matches official docs
- [ ] Add status field verification for Robokassa callbacks
- [ ] Set up Robokassa credentials in Supabase secrets
- [ ] Test with Robokassa test mode
- [ ] Update RLS policies if needed (currently service role handles inserts)
- [ ] Remove "TEST MODE" banners in production
- [ ] Add proper error handling and logging
- [ ] Set up monitoring for payment callbacks

## Switching to Robokassa

1. Set `PAYMENT_PROVIDER=robokassa` in Supabase Edge Function environment
2. Configure Robokassa credentials:
   - `ROBO_LOGIN`
   - `ROBO_PASSWORD1`
   - `ROBO_PASSWORD2`
3. Update signature implementation with proper MD5
4. Test in Robokassa test mode first
5. No changes needed to pages or routes - they work with both providers

