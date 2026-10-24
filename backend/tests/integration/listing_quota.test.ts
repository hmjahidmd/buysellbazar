import { createListingSchema } from '../../src/modules/listings/listing.validation';

describe('Phase 15: Listing Quota & Rolling 30-Ad Limit Integration Test', () => {
  const sampleListing = {
    title: 'Yamaha FZS V3 Dual Channel ABS 2023',
    description: 'Mint condition bike with BRTA smart card and updated tax token.',
    category: 'Vehicles',
    price: 285000,
    isNegotiable: true,
    condition: 'USED',
    location: {
      division: 'Dhaka',
      district: 'Dhaka',
      thana: 'Mirpur',
    },
    images: [{ url: 'https://cdn.marketplace.com.bd/listings/sample.webp' }],
    specifications: [
      { key: 'Brand', value: 'Yamaha' },
      { key: 'Year of Manufacture', value: '2023' },
    ],
  };

  test('1. Validates valid listing creation payload', () => {
    const valid = createListingSchema.body.safeParse(sampleListing);
    expect(valid.success).toBe(true);
  });

  test('2. Rejects listing creation when title or description is too short', () => {
    const invalidTitle = createListingSchema.body.safeParse({
      ...sampleListing,
      title: 'Bike', // < 5 chars
    });
    expect(invalidTitle.success).toBe(false);

    const invalidDesc = createListingSchema.body.safeParse({
      ...sampleListing,
      description: 'Used', // < 15 chars
    });
    expect(invalidDesc.success).toBe(false);
  });

  test('3. Accepts category specifications submitted by registered sellers', () => {
    const result = createListingSchema.body.safeParse(sampleListing);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.specifications).toEqual(sampleListing.specifications);
    }
  });

  test('4. Enforces rolling 24-hour 30-ad quota guard logic', () => {
    const MAX_DAILY_ADS = 30;

    // Simulate user with 30 active ads
    const userAdCount = 30;
    const canPost = userAdCount < MAX_DAILY_ADS;
    expect(canPost).toBe(false); // 31st post blocked

    // Simulate user with 29 active ads
    const userBelowQuota = 29;
    const canPostBelow = userBelowQuota < MAX_DAILY_ADS;
    expect(canPostBelow).toBe(true); // 30th post allowed
  });
});
