import { retrieveSession, type FetchLike } from '../_lib/stripe';
import { signToken } from '../../src/lib/token';

export interface Env {
  STRIPE_SECRET_KEY?: string;
  UNLOCK_SIGNING_KEY?: string;
}

const DAYS_30 = 30 * 24 * 3600;
const json = (b: unknown, status: number) =>
  new Response(JSON.stringify(b), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export async function handleVerify(url: URL, env: Env, f: FetchLike, now = Math.floor(Date.now() / 1000)): Promise<Response> {
  const id = url.searchParams.get('session_id');
  if (!id || !/^cs_[A-Za-z0-9_]+$/.test(id)) return json({ error: 'bad_request' }, 400);
  if (!env.STRIPE_SECRET_KEY || !env.UNLOCK_SIGNING_KEY) return json({ error: 'unavailable' }, 503);
  let s;
  try {
    s = await retrieveSession(f, env.STRIPE_SECRET_KEY, id);
  } catch {
    return json({ error: 'unavailable' }, 502);
  }
  if (!s || s.payment_status !== 'paid') return json({ error: 'not_paid' }, 402);
  return json({ token: await signToken({ exp: now + DAYS_30, sid: id }, env.UNLOCK_SIGNING_KEY) }, 200);
}

export const onRequestGet = ({ request, env }: { request: Request; env: Env }) =>
  handleVerify(new URL(request.url), env, (u, i) => fetch(u, i));
