/**
 * AES-256-GCM Encrypted Secrets Vault
 * Provides authenticated encryption for private external API keys, tokens, and credentials.
 */

import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits standard for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits standard

/**
 * Derives a consistent 32-byte (256-bit) encryption key from the environment secret
 */
function getMasterKey(): Buffer {
  const masterKeyString =
    process.env.ENCRYPTION_MASTER_KEY ||
    process.env.JWT_SECRET ||
    'dyno-forms-default-vault-master-key-32bytes-secure!';

  return crypto.createHash('sha256').update(masterKeyString).digest();
}

export interface EncryptedSecretPayload {
  encryptedSecret: string; // Hex string
  iv: string;              // Hex string
  authTag: string;         // Hex string
}

/**
 * Encrypts a plaintext secret using AES-256-GCM with a dynamic Initialization Vector (IV).
 */
export function encryptSecret(plaintext: string): EncryptedSecretPayload {
  if (!plaintext || typeof plaintext !== 'string') {
    throw new Error('Plaintext secret must be a non-empty string');
  }

  const key = getMasterKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');

  return {
    encryptedSecret: encrypted,
    iv: iv.toString('hex'),
    authTag,
  };
}

/**
 * Decrypts an AES-256-GCM ciphertext, verifying the authentication tag to ensure data integrity.
 */
export function decryptSecret(
  encryptedSecret: string,
  iv: string,
  authTag: string
): string {
  if (!encryptedSecret || !iv || !authTag) {
    throw new Error('Missing required encryption parameters for decryption');
  }

  const key = getMasterKey();
  const ivBuffer = Buffer.from(iv, 'hex');
  const authTagBuffer = Buffer.from(authTag, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, ivBuffer, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  decipher.setAuthTag(authTagBuffer);

  let decrypted = decipher.update(encryptedSecret, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Masks a secret string for safe display in creator dashboards
 * e.g. "sk_live_981248721498124" -> "sk_live_***98124"
 */
export function maskSecret(secret: string): string {
  if (!secret) return '••••••••';
  const clean = secret.trim();
  if (clean.length <= 8) {
    return '••••••••';
  }
  const prefix = clean.slice(0, 4);
  const suffix = clean.slice(-4);
  return `${prefix}••••${suffix}`;
}
