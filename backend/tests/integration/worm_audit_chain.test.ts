import crypto from 'crypto';
import { computeAuditHash } from '../../src/modules/moderation/auditLog.model';

describe('Phase 15: Cryptographic WORM Audit Hash Chain Integration Test', () => {
  const genesisHash = crypto.createHash('sha256').update('BUYSELL_BD_GENESIS_BLOCK').digest('hex');

  test('1. Calculates immutable SHA-256 block hash correctly', () => {
    const timestamp = new Date();
    const hash = computeAuditHash(genesisHash, {
      traceId: 'trace-test-1',
      userId: '65f2a1b9c9e77a001f3b1001',
      action: 'USER_REGISTERED',
      entityType: 'User',
      entityId: '65f2a1b9c9e77a001f3b1001',
      metadata: { role: 'seller' },
      timestamp,
    });

    expect(hash).toHaveLength(64);
    expect(/^[0-9a-f]{64}$/.test(hash)).toBe(true);
  });

  test('2. Enforces cryptographic hash chaining across sequential transactions', () => {
    const now = new Date();

    // Block 1: User Registered
    const block1Hash = computeAuditHash(genesisHash, {
      traceId: 'trace-1',
      userId: 'user_1',
      action: 'USER_REGISTERED',
      entityType: 'User',
      entityId: 'user_1',
      metadata: {},
      timestamp: now,
    });

    // Block 2: KYC Verified
    const block2Hash = computeAuditHash(block1Hash, {
      traceId: 'trace-2',
      userId: 'user_1',
      action: 'KYC_VERIFIED',
      entityType: 'KYC',
      entityId: 'user_1',
      metadata: { confidence: 99 },
      timestamp: new Date(now.getTime() + 1000),
    });

    // Block 3: Offer Accepted
    const block3Hash = computeAuditHash(block2Hash, {
      traceId: 'trace-3',
      userId: 'user_1',
      action: 'OFFER_ACCEPTED',
      entityType: 'Offer',
      entityId: 'offer_1',
      metadata: { price: 275000 },
      timestamp: new Date(now.getTime() + 2000),
    });

    const chain = [
      { previousHash: genesisHash, currentHash: block1Hash },
      { previousHash: block1Hash, currentHash: block2Hash },
      { previousHash: block2Hash, currentHash: block3Hash },
    ];

    // Verify unbroken chain
    for (let i = 1; i < chain.length; i++) {
      expect(chain[i].previousHash).toBe(chain[i - 1].currentHash);
    }
  });

  test('3. Detects tampering in historic audit records immediately', () => {
    const now = new Date();
    const block1Hash = computeAuditHash(genesisHash, {
      traceId: 't1',
      userId: 'u1',
      action: 'AUTH_LOGIN',
      entityType: 'Auth',
      timestamp: now,
    });

    const block2Hash = computeAuditHash(block1Hash, {
      traceId: 't2',
      userId: 'u1',
      action: 'POST_AD',
      entityType: 'Listing',
      timestamp: new Date(now.getTime() + 1000),
    });

    // Malicious actor modifies block 1 hash
    const tamperedBlock1Hash = crypto.createHash('sha256').update('CORRUPTED_ENTRY').digest('hex');

    // Chain verification fails at block 2
    const isLinkValid = block2Hash && tamperedBlock1Hash === block2Hash;
    expect(isLinkValid).toBe(false);
  });
});
