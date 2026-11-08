export const EVENTS = ['scan_done', 'test_download', 'checkout_start', 'full_download'] as const;
export type EventName = (typeof EVENTS)[number];

export interface Binding {
  writeDataPoint?: (p: { blobs: string[] }) => void;
}
export interface Env {
  EVENTS_BINDING?: string;
  [k: string]: unknown;
}

/** Stores nothing but the event name; no-op when no binding is configured. */
export async function handleEvent(request: Request, env: Env): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(null, { status: 400 });
  }
  const e = (body as { e?: unknown } | null)?.e;
  const keys = body && typeof body === 'object' ? Object.keys(body) : [];
  if (keys.length !== 1 || typeof e !== 'string' || !(EVENTS as readonly string[]).includes(e)) {
    return new Response(null, { status: 400 });
  }
  const b = env.EVENTS_BINDING ? (env[env.EVENTS_BINDING] as Binding | undefined) : undefined;
  b?.writeDataPoint?.({ blobs: [e] });
  return new Response(null, { status: 204 });
}

export const onRequestPost = ({ request, env }: { request: Request; env: Env }) => handleEvent(request, env);
