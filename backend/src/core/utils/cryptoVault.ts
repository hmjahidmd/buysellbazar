import crypto from 'crypto';
import env from '../../config/env';
import logger from '../../config/logger';

// AES-256-GCM requires a 32-byte (256-bit) key
const getDerivedKey = (): Buffer => {
  return crypto.createHash('sha256').update(env.CSFLE_MASTER_KEY).digest();
};

/**
 * Calculates a deterministic, one-way SHA-256 hash of a PII string (e.g. NID number or mobile number).
 * Normalizes input by trimming whitespace and converting to lowercase.
 * Used for unique index lookups on encrypted fields.
 */
export const hashDeterministic = (value: string): string => {
  if (!value) return '';
  const normalized = value.trim().toLowerCase();
  return crypto.createHash('sha256').update(normalized).digest('hex');
};

/**
 * Encrypts a sensitive string using AES-256-GCM authenticated encryption.
 * Output format: `<iv_hex>:<auth_tag_hex>:<cipher_hex>`
 */
export const encryptField = (plainText: string): string => {
  if (!plainText) return '';
  try {
    const key = getDerivedKey();
    const iv = crypto.randomBytes(12); // Standard 96-bit IV for GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  } catch (error) {
    logger.error('Encryption failure in cryptoVault: ', error);
    throw new Error('Cryptographic vault encryption error.');
  }
};

/**
 * Decrypts an AES-256-GCM encrypted string bundle (`<iv_hex>:<auth_tag_hex>:<cipher_hex>`).
 */
export const decryptField = (encryptedBundle: string): string => {
  if (!encryptedBundle) return '';
  try {
    const parts = encryptedBundle.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted bundle format. Expected iv:authTag:cipher.');
    }

    const [ivHex, authTagHex, cipherHex] = parts;
    const key = getDerivedKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(cipherHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    logger.error('Decryption failure in cryptoVault: ', error);
    throw new Error('Cryptographic vault decryption error.');
  }
};

export default {
  hashDeterministic,
  encryptField,
  decryptField,
};
