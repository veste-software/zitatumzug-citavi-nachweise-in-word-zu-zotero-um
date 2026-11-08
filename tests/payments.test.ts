import { describe, expect, it } from 'vitest';
import { b64urlEncode, gateFor, signToken, verifyToken } from '../src/lib/token';
import { handleCheckout } from '../functions/api/checkout';
import { handleVerify } from '../functions/api/verify';
import { handleEvent } from '../functions/api/event';
import { eventBody } from '../src/lib/track';

async function keys() {
  const k = (await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify'])) as CryptoKeyPair;
  return {
    priv: b64urlEncode(new Uint8Array(await crypto.subtle.exportKey('pkcs8', k.privateKey))),
    pub: b64urlEncode(new Uint8Array(await crypto.subtle.exportKey('raw', k.publicKey))),
  };
}
const NOW = 1_800_000_000;

describe('unlock token', () => {
  it('accepts valid, rejects expired, tampered, wrong key', async () => {
    const a = await keys();
    const b = await keys();
    const t = await signToken({ exp: NOW + 100, sid: 'cs_1' }, a.priv);
    expect((await verifyToken(t, a.pub, NOW))?.sid).toBe('cs_1');
    expect(await verifyToken(t, a.pub, NOW + 200)).toBeNull();
    expect(await verifyToken(t, b.pub, NOW)).toBeNull();
    const [body, sig] = t.split('.');
    const forged = b64urlEncode(new TextEncoder().encode(JSON.stringify({ exp: NOW + 99999, sid: 'cs_1' }))) + '.' + sig;
    expect(await verifyToken(forged, a.pub, NOW)).toBeNull();
    expect(await verifyToken(body, a.pub, NOW)).toBeNull();
    expect(await verifyToken('müll', a.pub, NOW)).toBeNull();
  });
  it('gate state', async () => {
    const a = await keys();
    const t = await signToken({ exp: NOW + 100, sid: 'cs_1' }, a.priv);
    expect(await gateFor(null, a.pub, NOW)).toBe('paywall');
    expect(await gateFor(t, a.pub, NOW)).toBe('full');
    expect(await gateFor(t, undefined, NOW)).toBe('paywall');
  });
});

const res = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status });

describe('checkout function', () => {
  it('503 without key', async () => {
    expect((await handleCheckout({}, async () => res({}))).status).toBe(503);
  });
  it('creates a session with the right success_url, no cookies', async () => {
    let body = '';
    const r = await handleCheckout({ STRIPE_SECRET_KEY: 'sk_test_x', STRIPE_PRICE_ID: 'price_1', SITE_URL: 'https://x.de/' }, async (_u, i) => {
      body = String(i?.body);
      return res({ url: 'https://checkout.stripe.com/c/1' });
    });
    expect(r.status).toBe(200);
    expect(r.headers.get('set-cookie')).toBeNull();
    expect((await r.json()).url).toContain('checkout.stripe.com');
    const p = new URLSearchParams(body);
    expect(p.get('line_items[0][price]')).toBe('price_1');
    expect(p.get('success_url')).toBe('https://x.de/?session_id={CHECKOUT_SESSION_ID}');
  });
  it('502 when stripe fails', async () => {
    const r = await handleCheckout({ STRIPE_SECRET_KEY: 'k', STRIPE_PRICE_ID: 'p', SITE_URL: 'https://x.de' }, async () => res({}, 500));
    expect(r.status).toBe(502);
  });
});

describe('verify function', () => {
  it('paid → token, unpaid → 402, unknown → 402, bad id → 400', async () => {
    const a = await keys();
    const env = { STRIPE_SECRET_KEY: 'sk_test_x', UNLOCK_SIGNING_KEY: a.priv };
    const u = (id: string) => new URL('https://x.de/api/verify?session_id=' + id);
    const paid = await handleVerify(u('cs_ok'), env, async () => res({ payment_status: 'paid' }), NOW);
    expect(paid.status).toBe(200);
    const { token } = await paid.json();
    expect((await verifyToken(token, a.pub, NOW))?.exp).toBe(NOW + 30 * 86400);
    expect((await handleVerify(u('cs_no'), env, async () => res({ payment_status: 'unpaid' }))).status).toBe(402);
    expect((await handleVerify(u('cs_x'), env, async () => res({}, 404))).status).toBe(402);
    expect((await handleVerify(u('bad%20id'), env, async () => res({}))).status).toBe(400);
    expect((await handleVerify(u('cs_ok'), {}, async () => res({}))).status).toBe(503);
  });
});

describe('event counter', () => {
  const req = (b: unknown) => new Request('https://x.de/api/event', { method: 'POST', body: typeof b === 'string' ? b : JSON.stringify(b) });
  it('accepts only the four names and stores only the name', async () => {
    const got: string[][] = [];
    const env = { EVENTS_BINDING: 'EV', EV: { writeDataPoint: (p: { blobs: string[] }) => got.push(p.blobs) } };
    expect((await handleEvent(req({ e: 'scan_done' }), env)).status).toBe(204);
    expect(got).toEqual([['scan_done']]);
    expect((await handleEvent(req({ e: 'other' }), env)).status).toBe(400);
    expect((await handleEvent(req({ e: 'scan_done', x: 1 }), env)).status).toBe(400);
    expect((await handleEvent(req('nope'), env)).status).toBe(400);
    expect((await handleEvent(req({ e: 'scan_done' }), {})).status).toBe(204);
  });
  it('client payload is only the name', () => {
    expect(JSON.parse(eventBody('full_download'))).toEqual({ e: 'full_download' });
  });
});
