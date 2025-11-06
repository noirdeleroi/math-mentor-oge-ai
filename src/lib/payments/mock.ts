import { PaymentProvider, CreateCheckoutParams, CreateCheckoutResult, CallbackResult } from './types';

/**
 * Simple hash for mock provider
 * Note: This is a simplified hash for mock purposes only
 * In production, use proper MD5 (e.g., via Edge Function)
 */
function simpleHash(input: string): string {
  // Simple hash function for mock (not cryptographically secure)
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16).padStart(32, '0').toUpperCase();
}

/**
 * Mock payment provider for testing
 * Simulates a payment gateway with a fake checkout page
 */
export class MockPaymentProvider implements PaymentProvider {
  private baseUrl: string;

  constructor(baseUrl: string = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173') {
    this.baseUrl = baseUrl;
  }

  async createCheckout(params: CreateCheckoutParams): Promise<CreateCheckoutResult> {
    // Generate a unique invoice ID
    const externalInvoiceId = `MOCK-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Build redirect URL with invoice ID and parameters
    const searchParams = new URLSearchParams({
      InvId: externalInvoiceId,
      CustomerNumber: params.userId,
      OutSum: params.amount.toString(),
      ...(params.courseId && { ShpCourseId: params.courseId }),
      ...(params.promocode && { ShpPromocode: params.promocode }),
    });

    const redirectUrl = `${this.baseUrl}/checkout/mock?${searchParams.toString()}`;

    return {
      redirectUrl,
      externalInvoiceId,
    };
  }

  async handleCallback(payload: Record<string, string>): Promise<CallbackResult> {
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
      throw new Error('Missing required payment fields');
    }

    // In mock mode, generate expected signature
    // Format: MD5(OutSum:InvId:CustomerNumber:ShpCourseId:ShpPromocode:MOCK_SECRET)
    const secret = process.env.MOCK_PAYMENT_SECRET || 'mock-secret-key';
    const signatureParts = [
      OutSum,
      InvId,
      CustomerNumber,
      ShpCourseId || '',
      ShpPromocode || '',
      secret,
    ];
    const expectedSignature = simpleHash(signatureParts.join(':'));

    // Verify signature (case-insensitive for mock)
    if (Signature.toUpperCase() !== expectedSignature) {
      throw new Error('Invalid payment signature');
    }

    return {
      externalInvoiceId: InvId,
      paid: parseFloat(OutSum),
      userId: CustomerNumber,
      courseId: ShpCourseId || undefined,
      promocode: ShpPromocode || undefined,
    };
  }
}

