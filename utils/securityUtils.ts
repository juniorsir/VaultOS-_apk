
import HmacSHA256 from 'crypto-js/hmac-sha256';
import Hex from 'crypto-js/enc-hex';
import Base64 from 'crypto-js/enc-base64';
import Utf8 from 'crypto-js/enc-utf8';
import { VaultProtocol } from '../types';

/**
 * Packs metadata based on the current protocol.
 * In HARDENED mode, it adds a V3 prefix and uses an enhanced encoding.
 */
export const packMetadata = (metaObj: object, protocol: VaultProtocol = 'LEGACY'): string => {
  const json = JSON.stringify(metaObj);
  
  if (protocol === 'HARDENED') {
    // Requirement: Prefix with 'V3:' for HARDENED mode before Base64 encoding
    return Base64.stringify(Utf8.parse("V3:" + json));
  }
  
  // LEGACY: Standard Base64
  return Base64.stringify(Utf8.parse(json));
};

export const generateSignature = (
  method: string,
  path: string,
  timestamp: string,
  nonce: string,
  metadata: string,
  signingKey: string
): string => {
  // Signature format: HMAC-SHA256(method + path + timestamp + nonce + metadata)
  // CRITICAL: Path must be the dynamic/resolved path
  // Metadata must be the final encoded string
  const baseString = `${method}${path}${timestamp}${nonce}${metadata}`;
  return HmacSHA256(baseString, signingKey).toString(Hex);
};

// Keeping for backward compatibility if needed in old components
export const encodeMetadata = (filename: string, size: number): string => {
  return packMetadata({ filename, size }, 'LEGACY');
};
