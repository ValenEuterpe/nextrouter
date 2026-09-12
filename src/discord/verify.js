/**
 * Discord Ed25519 Cryptographic Signature Verifier
 * Uses standard Web Crypto API (crypto.subtle)
 */

export function hexToUint8Array(hex) {
  if (!hex || typeof hex !== 'string') return new Uint8Array(0);
  const cleanHex = hex.trim();
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
  }
  return bytes;
}

export async function verifyDiscordSignature(request, rawBody, publicKeyHex) {
  const signatureHex = request.headers.get('X-Signature-Ed25519');
  const timestamp = request.headers.get('X-Signature-Timestamp');

  if (!signatureHex || !timestamp || !publicKeyHex) {
    return false;
  }

  try {
    const keyBytes = hexToUint8Array(publicKeyHex);
    const key = await crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'Ed25519' },
      false,
      ['verify']
    );

    const sigBytes = hexToUint8Array(signatureHex);
    const dataBytes = new TextEncoder().encode(timestamp + rawBody);

    return await crypto.subtle.verify(
      { name: 'Ed25519' },
      key,
      sigBytes,
      dataBytes
    );
  } catch (err) {
    return false;
  }
}
