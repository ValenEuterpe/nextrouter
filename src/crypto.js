/**
 * Cryptographic helpers using standard Web Crypto API (crypto.subtle)
 */

// Base64URL encoding/decoding helpers
export function base64UrlEncode(bytes) {
  let binary = '';
  const len = bytes.byteLength;
  const uint8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Computes SHA-256 hex string of a given input string
 */
export async function sha256(text) {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Constant-time comparison to prevent timing attacks
 */
export function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }
  const enc = new TextEncoder();
  const aBuf = enc.encode(a);
  const bBuf = enc.encode(b);

  if (aBuf.length !== bBuf.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < aBuf.length; i++) {
    result |= aBuf[i] ^ bBuf[i];
  }
  return result === 0;
}

/**
 * Gets an HMAC-SHA256 CryptoKey from secret string
 */
async function getHmacKey(secret) {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

/**
 * Generates an HMAC-SHA256 signed session token
 */
export async function createSessionToken(username, secret, maxAgeSeconds = 86400 * 7) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    u: username,
    exp: Math.floor(Date.now() / 1000) + maxAgeSeconds,
  };

  const enc = new TextEncoder();
  const headerB64 = base64UrlEncode(enc.encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(enc.encode(JSON.stringify(payload)));
  const dataToSign = `${headerB64}.${payloadB64}`;

  const key = await getHmacKey(secret);
  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    enc.encode(dataToSign)
  );
  const signatureB64 = base64UrlEncode(signatureBuffer);

  return `${dataToSign}.${signatureB64}`;
}

/**
 * Verifies an HMAC-SHA256 signed session token and returns payload if valid
 */
export async function verifySessionToken(token, secret) {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, signatureB64] = parts;
  const dataToSign = `${headerB64}.${payloadB64}`;

  try {
    const key = await getHmacKey(secret);
    const signatureBytes = base64UrlDecode(signatureB64);
    const enc = new TextEncoder();

    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes,
      enc.encode(dataToSign)
    );

    if (!isValid) return null;

    const payloadJson = new TextDecoder().decode(base64UrlDecode(payloadB64));
    const payload = JSON.parse(payloadJson);

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null; // Expired
    }

    return payload;
  } catch (err) {
    return null;
  }
}

/**
 * Generates a cryptographically random OpenAI-style API key (e.g. sk-...)
 */
export function generateApiKey(prefix = 'sk-') {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  let randomStr = '';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < bytes.length; i++) {
    randomStr += chars[bytes[i] % chars.length];
  }
  return `${prefix}${randomStr}`;
}
