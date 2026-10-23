import crypto from 'crypto';
import { PaymentService, BOOST_PRICING } from '../../src/modules/boosts/payment.service';
import env from '../../src/config/env';

describe('Phase 15: Monetization & MFS Payment IPN Webhook Integration Test', () => {
  const webhookPayload = {
    transactionRef: 'TXN_BK_99214710182',
    gatewayTransactionId: 'TRX9932014812',
    gateway: 'BKASH' as const,
    status: 'PAID' as const,
    amount: 499.0,
    currency: 'BDT',
    payerMsisdn: '01712345678',
    paidAt: '2026-10-23T00:32:15.000Z',
  };

  test('1. Validates genuine HMAC-SHA256 signature generated with shared MFS secret', () => {
    const rawPayload = JSON.stringify(webhookPayload);
    const validSignature = crypto
      .createHmac('sha256', env.MFS_WEBHOOK_SECRET)
      .update(rawPayload)
      .digest('hex');

    const isValid = PaymentService.verifyWebhookSignature(rawPayload, validSignature);
    expect(isValid).toBe(true);
  });

  test('2. Rejects forged or tampered webhook signatures', () => {
    const rawPayload = JSON.stringify(webhookPayload);
    const forgedSignature = '8b067d16d6a5f2e8c1b9a0d3f4e5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3';

    const isValid = PaymentService.verifyWebhookSignature(rawPayload, forgedSignature);
    expect(isValid).toBe(false);
  });

  test('3. Confirms boost pricing matrix and duration mapping', () => {
    expect(BOOST_PRICING.TOP_AD_3D).toEqual({ amount: 249, durationDays: 3 });
    expect(BOOST_PRICING.TOP_AD_7D).toEqual({ amount: 499, durationDays: 7 });
    expect(BOOST_PRICING.TOP_AD_15D).toEqual({ amount: 899, durationDays: 15 });
    expect(BOOST_PRICING.BUMP_UP).toEqual({ amount: 99, durationDays: 0 });
    expect(BOOST_PRICING.STOREFRONT_TIER_BASIC).toEqual({ amount: 999, durationDays: 30 });
    expect(BOOST_PRICING.STOREFRONT_TIER_PRO).toEqual({ amount: 2499, durationDays: 30 });
  });
});
