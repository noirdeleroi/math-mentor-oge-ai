/**
 * Payment provider interface
 * Implementations: mock, robokassa
 */
export interface PaymentProvider {
  /**
   * Create a checkout session and return redirect URL
   */
  createCheckout(params: CreateCheckoutParams): Promise<CreateCheckoutResult>;

  /**
   * Handle payment callback/webhook from payment gateway
   * Returns parsed payment data or throws on validation failure
   */
  handleCallback(payload: Record<string, string>): Promise<CallbackResult>;
}

export interface CreateCheckoutParams {
  userId: string;
  courseId?: string;
  amount: number;
  promocode?: string;
}

export interface CreateCheckoutResult {
  redirectUrl: string;
  externalInvoiceId: string;
}

export interface CallbackResult {
  externalInvoiceId: string;
  paid: number;
  userId: string;
  courseId?: string;
  promocode?: string;
}


