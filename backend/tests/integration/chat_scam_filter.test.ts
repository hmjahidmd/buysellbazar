import { SCAM_REGEX, SCAM_WARNING_MESSAGE } from '../../src/modules/chats/chat.service';

describe('Phase 15: Chat Anti-Scam Shield Integration Test', () => {
  const advanceScamPhrases = [
    'Bhai bKash advance 500 taka pathan courier delivery korbo',
    'bKash advance fee lagbe',
    'nagad advance charge den',
    'courier fee pathan',
    'advance taka pathan',
    'কুরিয়ার চার্জ পাঠিয়ে দিন',
    'অগ্রিম বিকাশ করুন',
  ];

  const legitimateMessages = [
    'Bhai bike ta dekhte kobe ashte pari?',
    'Mirpur 10 metro station er samne meet kora jabe?',
    'Original tax token papers up to date ache kina?',
    'Price ki kisu kom kora jabe face to face?',
  ];

  test('1. Intercepts all MFS and advance courier scam patterns', () => {
    for (const msg of advanceScamPhrases) {
      const isMatch = SCAM_REGEX.test(msg);
      expect(isMatch).toBe(true);
    }
  });

  test('2. Allows clean legitimate negotiation messages without false positives', () => {
    for (const msg of legitimateMessages) {
      const isMatch = SCAM_REGEX.test(msg);
      expect(isMatch).toBe(false);
    }
  });

  test('3. Confirms high-risk policy warning message content', () => {
    expect(SCAM_WARNING_MESSAGE).toContain('অগ্রিম বিকাশ বা নগদ-এ টাকা পাঠাবেন না');
  });
});
