// Life Emoji unlock codes. No server: the founder signs each code with a private key kept offline
// (tools/make-unlock-code.mjs), and the app checks the signature with this public key.
// A code can't be invented, but it can be shared; without accounts that can't be prevented.

export const UNLOCK_PUBLIC_KEY: JsonWebKey = {"kty":"EC","crv":"P-256","x":"H-ZeDOehJ2fElrs-13UeWs7uclhiwkCsAi8L8IZa2NE","y":"yq9PCAK7bNU3eMmiOWgyCe9yNiwBySgQYemYbSj-04I"};

export const CODE_PREFIX = 'UMR1-';
const CONTEXT = 'umr-life-emoji-v1:';
const ID_BYTES = 8;
const SIG_BYTES = 64;

function fromBase64Url(s: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(s)) return null;
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4);
  try {
    const bin = atob(b64);
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

/** Removes spaces and line breaks people pick up when copying from an email. */
export function cleanCode(raw: string) {
  return raw.replace(/\s+/g, '').trim();
}

export async function verifyCodeWith(jwk: JsonWebKey, raw: string): Promise<boolean> {
  const code = cleanCode(raw);
  if (code.slice(0, CODE_PREFIX.length).toUpperCase() !== CODE_PREFIX) return false;
  const bytes = fromBase64Url(code.slice(CODE_PREFIX.length));
  if (!bytes || bytes.length !== ID_BYTES + SIG_BYTES) return false;
  try {
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    const prefix = new TextEncoder().encode(CONTEXT);
    const msg = new Uint8Array(prefix.length + ID_BYTES);
    msg.set(prefix);
    msg.set(bytes.slice(0, ID_BYTES), prefix.length);
    return await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, bytes.slice(ID_BYTES), msg);
  } catch {
    return false;
  }
}

export function verifyCode(raw: string) {
  return verifyCodeWith(UNLOCK_PUBLIC_KEY, raw);
}
