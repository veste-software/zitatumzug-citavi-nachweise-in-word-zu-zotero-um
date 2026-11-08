/** Unlock token: base64url(JSON {exp, sid}) + "." + base64url(Ed25519 signature). Works in browsers and Node (WebCrypto). */
export interface TokenPayload {
  /** expiry, seconds since epoch */
  exp: number;
  /** Stripe Checkout session id */
  sid: string;
}

const enc = new TextEncoder();
const subtle = () => globalThis.crypto.subtle;

export function b64urlEncode(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function b64urlDecode(s: string): Uint8Array<ArrayBuffer> {
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad);
  const out = new Uint8Array(new ArrayBuffer(b.length));
  for (let i = 0; i < b.length; i++) out[i] = b.charCodeAt(i);
  return out;
}

/** Private key: base64url PKCS#8. Used by the verify function and gen-keys only. */
export async function signToken(payload: TokenPayload, privateKeyPkcs8: string): Promise<string> {
  const key = await subtle().importKey('pkcs8', b64urlDecode(privateKeyPkcs8), { name: 'Ed25519' }, false, ['sign']);
  const body = b64urlEncode(enc.encode(JSON.stringify(payload)));
  const sig = new Uint8Array(await subtle().sign('Ed25519', key, enc.encode(body)));
  return body + '.' + b64urlEncode(sig);
}

/** Public key: base64url raw 32 bytes. Returns the payload when valid and not expired, else null. */
export async function verifyToken(
  token: string,
  publicKeyRaw: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<TokenPayload | null> {
  try {
    const [body, sig, extra] = token.trim().split('.');
    if (!body || !sig || extra !== undefined) return null;
    const key = await subtle().importKey('raw', b64urlDecode(publicKeyRaw), { name: 'Ed25519' }, false, ['verify']);
    const ok = await subtle().verify('Ed25519', key, b64urlDecode(sig), enc.encode(body));
    if (!ok) return null;
    const p = JSON.parse(new TextDecoder().decode(b64urlDecode(body)));
    if (typeof p.exp !== 'number' || typeof p.sid !== 'string' || p.exp <= nowSeconds) return null;
    return p;
  } catch {
    return null;
  }
}

export const PASS_KEY = 'zitatumzug-pass';

export function loadPass(): string | null {
  try {
    return localStorage.getItem(PASS_KEY);
  } catch {
    return null;
  }
}

export function savePass(token: string): void {
  try {
    localStorage.setItem(PASS_KEY, token);
  } catch {
    /* storage blocked: the pass stays usable for this page view */
  }
}

export type Gate = 'paywall' | 'full';
/** State helper for the UI: no valid token → paywall, valid token → full button. */
export async function gateFor(token: string | null, publicKeyRaw: string | undefined, now?: number): Promise<Gate> {
  if (!token || !publicKeyRaw) return 'paywall';
  return (await verifyToken(token, publicKeyRaw, now)) ? 'full' : 'paywall';
}
