/**
 * Server-side encryption utilities for API keys
 * Uses AES-256-GCM for secure encryption
 *
 * KEY ROTATION PROCEDURE:
 * If ENCRYPTION_KEY is compromised, follow these steps:
 * 1. Generate a new 32-byte key: `openssl rand -hex 32`
 * 2. Create a migration script that:
 *    a. Fetches all encrypted_key values from api_keys table
 *    b. Decrypts each with OLD_ENCRYPTION_KEY
 *    c. Re-encrypts each with NEW_ENCRYPTION_KEY
 *    d. Updates the database records
 * 3. Update ENCRYPTION_KEY environment variable
 * 4. Deploy the changes
 *
 * Note: This must be done atomically to avoid data loss.
 * Consider implementing versioned encryption (key_version field) for smoother rotation.
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { ENCRYPTION_KEY } from '$env/static/private';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits

/**
 * Get the encryption key from environment
 * Key should be 32 bytes (64 hex characters)
 */
function getKey(): Buffer {
	if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
		throw new Error('ENCRYPTION_KEY must be a 64-character hex string (32 bytes)');
	}
	return Buffer.from(ENCRYPTION_KEY, 'hex');
}

/**
 * Encrypt a plaintext string (e.g., API key)
 * Returns: base64 encoded string containing IV + ciphertext + auth tag
 */
export function encrypt(plaintext: string): string {
	const key = getKey();
	const iv = randomBytes(IV_LENGTH);
	const cipher = createCipheriv(ALGORITHM, key, iv);

	let encrypted = cipher.update(plaintext, 'utf8', 'hex');
	encrypted += cipher.final('hex');

	const authTag = cipher.getAuthTag();

	// Combine IV + ciphertext + authTag
	const combined = Buffer.concat([iv, Buffer.from(encrypted, 'hex'), authTag]);

	return combined.toString('base64');
}

/**
 * Decrypt an encrypted string back to plaintext
 * Input: base64 encoded string containing IV + ciphertext + auth tag
 */
export function decrypt(encryptedData: string): string {
	const key = getKey();
	const combined = Buffer.from(encryptedData, 'base64');

	// Extract IV, ciphertext, and auth tag
	const iv = combined.subarray(0, IV_LENGTH);
	const authTag = combined.subarray(combined.length - AUTH_TAG_LENGTH);
	const ciphertext = combined.subarray(IV_LENGTH, combined.length - AUTH_TAG_LENGTH);

	const decipher = createDecipheriv(ALGORITHM, key, iv);
	decipher.setAuthTag(authTag);

	let decrypted = decipher.update(ciphertext);
	decrypted = Buffer.concat([decrypted, decipher.final()]);

	return decrypted.toString('utf8');
}

/**
 * Mask an API key for display (show only first 4 and last 4 chars)
 * Example: "sk-abcdefghij123456" -> "sk-a...3456"
 */
export function maskApiKey(key: string): string {
	if (key.length <= 12) {
		return '*'.repeat(key.length);
	}
	return `${key.slice(0, 7)}...${key.slice(-4)}`;
}
