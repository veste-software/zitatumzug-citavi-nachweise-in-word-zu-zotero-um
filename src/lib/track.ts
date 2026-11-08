import { href } from './url';

export type TrackEvent = 'scan_done' | 'test_download' | 'checkout_start' | 'full_download';

export const eventBody = (e: TrackEvent) => JSON.stringify({ e });

/** Anonymous counter: sends only the event name; errors are swallowed. */
export function track(e: TrackEvent): void {
  try {
    void fetch(href('/api/event'), { method: 'POST', body: eventBody(e), keepalive: true }).catch(() => {});
  } catch {
    /* ignore */
  }
}
