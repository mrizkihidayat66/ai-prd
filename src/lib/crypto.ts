/**
 * AES-256-GCM encryption utility for sensitive data (API keys).
 *
 * Uses Node's built-in crypto module for symmetric encryption at rest.
 * The encryption key is derived from ENCRYPTION_KEY env var (or a default
 * fallback for development). In production, ENCRYPTION_KEY should be a
 * cryptographically random 32-byte hex string.
 *
 * Storage format: `enc:v1:<iv-hex>:<authTag-hex>:<ciphertext-hex>`
 * - Plaintext detection: if a stored value does NOT start with `enc:v1:`,
 *   it is treated as legacy plaintext and returned as-is (allows lazy
 *   migration of existing rows).
 */
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const ENCRYPTED_PREFIX = 'enc:v1:';
const IV_LENGTH = 12; // 96-bit IV recommended for GCM
const KEY_LENGTH = 32; // 256-bit key
const SALT = 'ai-prd-static-salt-v1'; // static salt; key material comes from env

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  const secret =
    process.env.ENCRYPTION_KEY ||
    process.env.NEXTAUTH_SECRET ||
    'ai-prd-default-dev-key-change-me-in-production-please';

  // Derive a 32-byte key from the secret using scrypt
  cachedKey = scryptSync(secret, SALT, KEY_LENGTH);
  return cachedKey;
}

/**
 * Encrypt a plaintext string. Returns null if input is null/empty.
 */
export function encrypt(plaintext: string | null | undefined): string | null {
  if (!plaintext) return null;
  // Idempotent: if already encrypted, return as-is
  if (plaintext.startsWith(ENCRYPTED_PREFIX)) return plaintext;

  const iv = randomBytes(IV_LENGTH);
  const key = getKey();
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${ENCRYPTED_PREFIX}${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypt a stored value. If the value is plaintext (no prefix), returns it as-is.
 * Returns null if input is null/empty. Throws if format is invalid or auth tag fails.
 */
export function decrypt(stored: string | null | undefined): string | null {
  if (!stored) return null;

  // Legacy plaintext support: return as-is
  if (!stored.startsWith(ENCRYPTED_PREFIX)) {
    return stored;
  }

  const payload = stored.slice(ENCRYPTED_PREFIX.length);
  const parts = payload.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted payload format');
  }

  const [ivHex, authTagHex, ciphertextHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');

  const key = getKey();
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}

/**
 * Safe decrypt: returns null on any error (including auth tag mismatch).
 * Use when you'd rather degrade gracefully than crash the request.
 */
export function safeDecrypt(stored: string | null | undefined): string | null {
  try {
    return decrypt(stored);
  } catch (e) {
    console.error('[crypto] decrypt failed:', e instanceof Error ? e.message : String(e));
    return null;
  }
}

/**
 * Mask an API key for display (e.g., in GET responses).
 * Always operates on the decrypted plaintext.
 */
export function maskApiKey(key: string | null | undefined): string | null {
  if (!key) return null;
  if (key.length <= 4) return '••••';
  return '••••••' + key.slice(-4);
}
