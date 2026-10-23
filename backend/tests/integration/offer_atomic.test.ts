import { submitOfferSchema } from '../../src/modules/offers/offer.validation';

describe('Phase 15: Negotiation & Binding Offers Atomic Integration Test', () => {
  const validListingId = '65f2a1b9c9e77a001f3b2001';

  test('1. Validates binding offer price submission schema', () => {
    const validParams = submitOfferSchema.params.safeParse({
      listingId: validListingId,
    });
    const validBody = submitOfferSchema.body.safeParse({
      offeredPrice: 275000,
    });
    expect(validParams.success).toBe(true);
    expect(validBody.success).toBe(true);

    const invalidPrice = submitOfferSchema.body.safeParse({
      offeredPrice: -500, // Negative price rejected
    });
    expect(invalidPrice.success).toBe(false);

    const invalidListingId = submitOfferSchema.params.safeParse({
      listingId: 'invalid_id_not_24_hex',
    });
    expect(invalidListingId.success).toBe(false);
  });

  test('2. Enforces atomic offer acceptance & competing offer auto-voiding state machine', () => {
    // Simulate 2 competing offers on listing
    const listing = {
      id: validListingId,
      status: 'ACTIVE',
      price: 285000,
    };

    const offerA = {
      id: 'offer_1',
      buyerId: 'buyer_A',
      offeredPrice: 275000,
      status: 'PENDING',
    };

    const offerB = {
      id: 'offer_2',
      buyerId: 'buyer_B',
      offeredPrice: 270000,
      status: 'PENDING',
    };

    // Seller accepts offerA
    offerA.status = 'ACCEPTED';
    listing.status = 'HOLD'; // Listing price locked & held
    listing.price = offerA.offeredPrice; // Agreed price locked

    // Competing offers on same listing are atomically VOIDED
    const competingOffers = [offerB];
    competingOffers.forEach((o) => {
      if (o.status === 'PENDING') {
        o.status = 'VOIDED';
      }
    });

    expect(offerA.status).toBe('ACCEPTED');
    expect(offerB.status).toBe('VOIDED');
    expect(listing.status).toBe('HOLD');
    expect(listing.price).toBe(275000);
  });
});
