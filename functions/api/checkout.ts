import { createCheckoutSession, type FetchLike } from '../_lib/stripe';

export interface Env {
  STRIPE_SECRET_KEY?: string;
  STRIPE_PRICE_ID?: string;
  SITE_URL?: string;
}

const json = (b: unknown, status: number) =>
  new Response(JSON.stringify(b), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export async function handleCheckout(env: Env, f: FetchLike): Promise<Response> {
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_PRICE_ID || !env.SITE_URL) return json({ error: 'unavailable' }, 503);
  try {
    const s = await createCheckoutSession(f, {
      secretKey: env.STRIPE_SECRET_KEY,
      priceId: env.STRIPE_PRICE_ID,
      siteUrl: env.SITE_URL.replace(/\/$/, ''),
    });
    return s ? json(s, 200) : json({ error: 'unavailable' }, 502);
  } catch {
    return json({ error: 'unavailable' }, 502);
  }
}

export const onRequestPost = ({ env }: { env: Env }) => handleCheckout(env, (u, i) => fetch(u, i));
