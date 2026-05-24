const crypto = require('crypto');

/**
 * Computes HMAC-SHA-256(input, PIN_PEPPER).
 * Input is expected to be the SHA-256 hex hash sent by the frontend.
 * The result is stored in the database instead of the raw PIN.
 *
 * Deterministic: same input + same secret → same output.
 * This allows uniqueness checks without exposing the raw PIN.
 */
function hashPin(sha256Hex) {
    const pepper = process.env.PIN_PEPPER;
    if (!pepper) throw new Error('PIN_PEPPER environment variable is not set.');
    return crypto.createHmac('sha256', pepper).update(sha256Hex).digest('hex');
}

/**
 * Validates that the received value looks like a SHA-256 hex string
 * (64 lowercase hex characters). The frontend always sends SHA-256(rawPin).
 */
function isValidPinHash(value) {
    return typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
}

module.exports = { hashPin, isValidPinHash };
