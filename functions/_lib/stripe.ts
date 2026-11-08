/** Stripe REST helpers; fetch is injected so tests can mock it. No SDK. */
export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export async function createCheckoutSession(
  f: FetchLike,
  o: { secretKey: string; priceId: string; siteUrl: string },
): Promise<{ url: string } | null> {
  const body = new URLSearchParams({
    mode: 'payment',
    'line_items[0][price]': o.priceId,
    'line_items[0][quantity]': '1',
    success_url: `${o.siteUrl}/?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${o.siteUrl}/`,
  });
  const r = await f('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${o.secretKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!r.ok) return null;
  const j = (await r.json()) as { url?: string };
  return j.url ? { url: j.url } : null;
}

export async function retrieveSession(
  f: FetchLike,
  secretKey: string,
  id: string,
): Promise<{ payment_status: string } | null> {
  const r = await f(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  if (!r.ok) return null;
  return (await r.json()) as { payment_status: string };
}
