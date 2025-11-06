import { PaymentProvider, CreateCheckoutParams, CreateCheckoutResult, CallbackResult } from './types';

/**
 * MD5 hash using crypto library (for Edge Functions)
 * TODO: Verify exact signature formula matches official Robokassa docs
 */
async function md5Hash(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('MD5', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

/**
 * Robokassa payment provider
 * TODO: Match official Robokassa documentation for exact signature formula
 * Reference: https://docs.robokassa.ru/
 */
export class RobokassaPaymentProvider implements PaymentProvider {
  private login: string;
  private password1: string; // For generating payment URL
  private password2: string; // For validating callback
  private baseUrl: string;
  private isTestMode: boolean;

  constructor() {
    this.login = process.env.ROBO_LOGIN || '';
    this.password1 = process.env.ROBO_PASSWORD1 || '';
    this.password2 = process.env.ROBO_PASSWORD2 || '';
    this.baseUrl = process.env.ROBOKASSA_BASE_URL || 'https://auth.robokassa.ru/Merchant/Index.aspx';
    this.isTestMode = process.env.ROBOKASSA_TEST_MODE === 'true';

    if (!this.login || !this.password1 || !this.password2) {
      console.warn('Robokassa credentials not fully configured');
    }
  }

  async createCheckout(params: CreateCheckoutParams): Promise<CreateCheckoutResult> {
    if (!this.login || !this.password1) {
      throw new Error('Robokassa not configured');
    }

    // Generate invoice ID (must be unique)
    const externalInvoiceId = `ROBO-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Build signature for payment URL
    // TODO: Match official Robokassa docs for exact formula
    // Typical format: MD5(Login:OutSum:InvId:Password1:Shp_*)
    const signatureParts = [
      this.login,
      params.amount.toString(),
      externalInvoiceId,
      this.password1,
    ];

    // Add custom parameters (Shp_*)
    const customParams: string[] = [];
    if (params.courseId) {
      customParams.push(`ShpCourseId=${params.courseId}`);
    }
    if (params.promocode) {
      customParams.push(`ShpPromocode=${params.promocode}`);
    }

    // Sort custom params alphabetically (Robokassa requirement)
    customParams.sort();

    const signatureString = [
      ...signatureParts,
      ...customParams.map(p => p.split('=')[1]), // Extract values only
    ].join(':');

    const signature = await md5Hash(signatureString);

    // Build Robokassa payment URL
    const searchParams = new URLSearchParams({
      MerchantLogin: this.login,
      OutSum: params.amount.toString(),
      InvId: externalInvoiceId,
      Description: `Subscription${params.courseId ? ` - Course ${params.courseId}` : ''}`,
      SignatureValue: signature,
      CustomerNumber: params.userId,
      ...(this.isTestMode && { IsTest: '1' }),
      ...(params.courseId && { ShpCourseId: params.courseId }),
      ...(params.promocode && { ShpPromocode: params.promocode }),
    });

    const redirectUrl = `${this.baseUrl}?${searchParams.toString()}`;

    return {
      redirectUrl,
      externalInvoiceId,
    };
  }

  async handleCallback(payload: Record<string, string>): Promise<CallbackResult> {
    if (!this.password2) {
      throw new Error('Robokassa callback password not configured');
    }

    const {
      OutSum,
      InvId,
      CustomerNumber,
      ShpCourseId,
      ShpPromocode,
      Signature, // SignatureValue from Robokassa
      // TODO: Check for status field (e.g., StateCode) to verify success
      // Robokassa may send additional status fields
    } = payload;

    // Validate required fields
    if (!OutSum || !InvId || !CustomerNumber || !Signature) {
      throw new Error('Missing required payment fields');
    }

    // Verify signature
    // TODO: Match official Robokassa docs for exact callback signature formula
    // Typical format: MD5(OutSum:InvId:Password2:Shp_*)
    const signatureParts = [
      OutSum,
      InvId,
      this.password2,
    ];

    // Add custom parameters (Shp_*), sorted alphabetically
    const customParams: string[] = [];
    if (ShpCourseId) {
      customParams.push(`ShpCourseId=${ShpCourseId}`);
    }
    if (ShpPromocode) {
      customParams.push(`ShpPromocode=${ShpPromocode}`);
    }
    customParams.sort();

    const signatureString = [
      ...signatureParts,
      ...customParams.map(p => p.split('=')[1]), // Extract values only
    ].join(':');

    const expectedSignature = await md5Hash(signatureString);

    // Verify signature (case-sensitive, uppercase)
    if (Signature.toUpperCase() !== expectedSignature) {
      throw new Error('Invalid Robokassa signature');
    }

    // TODO: Verify payment status field if present
    // Example: if (StateCode !== '5') throw new Error('Payment not completed');

    return {
      externalInvoiceId: InvId,
      paid: parseFloat(OutSum),
      userId: CustomerNumber,
      courseId: ShpCourseId || undefined,
      promocode: ShpPromocode || undefined,
    };
  }
}

