/**
 * ============================================================================
 * FILE ENCRYPTION SERVICE - PRODUCTION READY
 * ============================================================================
 * 
 * Provides AES-256-GCM encryption for files at rest.
 * 
 * FEATURES:
 *   ✓ AES-256-GCM encryption (authenticated encryption)
 *   ✓ Cryptographically secure random IVs (96-bit)
 *   ✓ Authentication tags for integrity verification
 *   ✓ Key derivation from master key (PBKDF2)
 *   ✓ Automatic format: IV + AuthTag + EncryptedData (concatenated)
 *   ✓ Error handling and validation
 *   ✓ Production logging
 * 
 * ENCRYPTION FLOW:
 *   1. Load master key from environment (ENCRYPTION_KEY)
 *   2. Generate random 96-bit IV
 *   3. Derive encryption key using PBKDF2 (per-file salt for extra security)
 *   4. Encrypt plaintext with AES-256-GCM
 *   5. Return: IV (12 bytes) + AuthTag (16 bytes) + Ciphertext (variable)
 * 
 * DECRYPTION FLOW:
 *   1. Extract IV (first 12 bytes)
 *   2. Extract AuthTag (next 16 bytes)
 *   3. Extract Ciphertext (remaining bytes)
 *   4. Derive same key using same salt
 *   5. Decrypt & verify with AuthTag
 *   6. Return plaintext or throw if verification fails
 * 
 * ============================================================================
 */

const crypto = require("crypto");

/**
 * Configuration for encryption
 */
const ENCRYPTION_CONFIG = {
  // AES-256-GCM constants
  ALGORITHM: "aes-256-gcm",
  IV_BYTES: 12, // 96 bits (recommended for GCM)
  AUTH_TAG_BYTES: 16, // 128 bits
  KEY_LENGTH: 32, // 256 bits for AES-256
  
  // PBKDF2 key derivation
  PBKDF2_ITERATIONS: 100000,
  PBKDF2_DIGEST: "sha256",
  SALT_BYTES: 16, // 128-bit salt
  
  // Logging
  ENABLE_LOGGING: process.env.NODE_ENV === "development",
  
  // File size limits
  MAX_FILE_SIZE: 500 * 1024 * 1024, // 500 MB
};

/**
 * Get the master encryption key from environment
 * @returns {Buffer} Master encryption key (must be 32 bytes for AES-256)
 * @throws {Error} If key not configured
 */
function getMasterKey() {
  const keyEnv = process.env.ENCRYPTION_KEY;
  
  if (!keyEnv) {
    throw new Error(
      "ENCRYPTION_KEY environment variable not configured. " +
      "Generate a 64-character hex string: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }

  try {
    // Expect hex-encoded key (32 bytes = 64 hex characters)
    const key = Buffer.from(keyEnv, "hex");
    
    if (key.length !== ENCRYPTION_CONFIG.KEY_LENGTH) {
      throw new Error(
        `Invalid key length: ${key.length} bytes. Expected ${ENCRYPTION_CONFIG.KEY_LENGTH} bytes (64 hex chars).`
      );
    }

    return key;
  } catch (err) {
    throw new Error(
      `Failed to parse ENCRYPTION_KEY: ${err.message}. ` +
      `Must be ${ENCRYPTION_CONFIG.KEY_LENGTH * 2} hex characters.`
    );
  }
}

/**
 * Derive an encryption key from master key using PBKDF2
 * @param {Buffer} masterKey - Master encryption key
 * @param {Buffer} salt - Salt for key derivation
 * @returns {Buffer} Derived key
 */
function deriveKey(masterKey, salt) {
  try {
    return crypto.pbkdf2Sync(
      masterKey,
      salt,
      ENCRYPTION_CONFIG.PBKDF2_ITERATIONS,
      ENCRYPTION_CONFIG.KEY_LENGTH,
      ENCRYPTION_CONFIG.PBKDF2_DIGEST
    );
  } catch (err) {
    throw new Error(`Key derivation failed: ${err.message}`);
  }
}

/**
 * Encrypt a file buffer using AES-256-GCM
 * 
 * Format: [IV (12 bytes)] + [AuthTag (16 bytes)] + [Ciphertext (variable)]
 * 
 * @param {Buffer} plaintext - File data to encrypt
 * @returns {Buffer} Encrypted file with IV and auth tag prepended
 * @throws {Error} If encryption fails
 */
function encryptFile(plaintext) {
  try {
    // Validate input
    if (!Buffer.isBuffer(plaintext)) {
      throw new Error("Input must be a Buffer");
    }

    if (plaintext.length === 0) {
      throw new Error("Cannot encrypt empty file");
    }

    if (plaintext.length > ENCRYPTION_CONFIG.MAX_FILE_SIZE) {
      throw new Error(
        `File too large: ${plaintext.length} bytes. Max: ${ENCRYPTION_CONFIG.MAX_FILE_SIZE} bytes.`
      );
    }

    // Get master key
    const masterKey = getMasterKey();

    // Generate random IV and salt
    const iv = crypto.randomBytes(ENCRYPTION_CONFIG.IV_BYTES);
    const salt = crypto.randomBytes(ENCRYPTION_CONFIG.SALT_BYTES);

    // Derive encryption key from master key
    const derivedKey = deriveKey(masterKey, salt);

    // Create cipher
    const cipher = crypto.createCipheriv(
      ENCRYPTION_CONFIG.ALGORITHM,
      derivedKey,
      iv
    );

    // Encrypt
    let ciphertext = cipher.update(plaintext);
    ciphertext = Buffer.concat([ciphertext, cipher.final()]);

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    // Concatenate: salt + IV + authTag + ciphertext
    // Format allows decryption to derive same key from same salt
    const encryptedBuffer = Buffer.concat([
      salt,
      iv,
      authTag,
      ciphertext,
    ]);

    if (ENCRYPTION_CONFIG.ENABLE_LOGGING) {
      console.log(
        `[encryptionService] Encrypted ${plaintext.length} bytes -> ${encryptedBuffer.length} bytes`
      );
    }

    return encryptedBuffer;
  } catch (err) {
    const message = `Encryption failed: ${err.message}`;
    console.error(`[encryptionService] ${message}`);
    throw new Error(message);
  }
}

/**
 * Decrypt a file buffer encrypted with encryptFile()
 * 
 * Expected format: [Salt (16 bytes)] + [IV (12 bytes)] + [AuthTag (16 bytes)] + [Ciphertext (variable)]
 * 
 * @param {Buffer} encryptedBuffer - Encrypted file data
 * @returns {Buffer} Decrypted plaintext
 * @throws {Error} If decryption fails or authentication fails
 */
function decryptFile(encryptedBuffer) {
  try {
    // Validate input
    if (!Buffer.isBuffer(encryptedBuffer)) {
      throw new Error("Input must be a Buffer");
    }

    const minSize = ENCRYPTION_CONFIG.SALT_BYTES +
                    ENCRYPTION_CONFIG.IV_BYTES +
                    ENCRYPTION_CONFIG.AUTH_TAG_BYTES;

    if (encryptedBuffer.length < minSize) {
      throw new Error(
        `Invalid encrypted data: too short (${encryptedBuffer.length} bytes, min ${minSize})`
      );
    }

    // Extract components
    let offset = 0;
    const salt = encryptedBuffer.slice(
      offset,
      (offset += ENCRYPTION_CONFIG.SALT_BYTES)
    );
    const iv = encryptedBuffer.slice(
      offset,
      (offset += ENCRYPTION_CONFIG.IV_BYTES)
    );
    const authTag = encryptedBuffer.slice(
      offset,
      (offset += ENCRYPTION_CONFIG.AUTH_TAG_BYTES)
    );
    const ciphertext = encryptedBuffer.slice(offset);

    // Get master key
    const masterKey = getMasterKey();

    // Derive same key from salt
    const derivedKey = deriveKey(masterKey, salt);

    // Create decipher
    const decipher = crypto.createDecipheriv(
      ENCRYPTION_CONFIG.ALGORITHM,
      derivedKey,
      iv
    );

    // Set auth tag for verification
    decipher.setAuthTag(authTag);

    // Decrypt
    let plaintext = decipher.update(ciphertext);
    plaintext = Buffer.concat([plaintext, decipher.final()]);

    if (ENCRYPTION_CONFIG.ENABLE_LOGGING) {
      console.log(
        `[encryptionService] Decrypted ${encryptedBuffer.length} bytes -> ${plaintext.length} bytes`
      );
    }

    return plaintext;
  } catch (err) {
    const message = `Decryption failed: ${err.message}`;
    console.error(`[encryptionService] ${message}`);
    throw new Error(message);
  }
}

/**
 * Test if a buffer is encrypted (basic check)
 * Encrypted buffers have minimum size of salt+IV+authTag
 * @param {Buffer} buffer - Buffer to check
 * @returns {boolean} True if likely encrypted
 */
function isEncrypted(buffer) {
  if (!Buffer.isBuffer(buffer)) return false;
  
  const minSize = ENCRYPTION_CONFIG.SALT_BYTES +
                  ENCRYPTION_CONFIG.IV_BYTES +
                  ENCRYPTION_CONFIG.AUTH_TAG_BYTES;
  
  return buffer.length >= minSize;
}

/**
 * Generate a new encryption key (for setup/rotation)
 * @returns {string} Hex-encoded 256-bit key (64 characters)
 */
function generateNewKey() {
  const key = crypto.randomBytes(ENCRYPTION_CONFIG.KEY_LENGTH);
  return key.toString("hex");
}

module.exports = {
  encryptFile,
  decryptFile,
  isEncrypted,
  generateNewKey,
  getMasterKey,
  ENCRYPTION_CONFIG,
};
