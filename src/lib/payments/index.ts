import { PaymentProvider } from './types';
import { MockPaymentProvider } from './mock';
import { RobokassaPaymentProvider } from './robokassa';

/**
 * Get payment provider based on PAYMENT_PROVIDER environment variable
 * Defaults to 'mock' if not set
 */
export function getPaymentProvider(): PaymentProvider {
  const provider = process.env.PAYMENT_PROVIDER || 'mock';

  switch (provider) {
    case 'robokassa':
      return new RobokassaPaymentProvider();
    case 'mock':
    default:
      return new MockPaymentProvider();
  }
}

export * from './types';
export { MockPaymentProvider } from './mock';
export { RobokassaPaymentProvider } from './robokassa';


