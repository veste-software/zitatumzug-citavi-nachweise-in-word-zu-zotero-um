/**
 * Build an internal URL that respects the base path (previews live under /<repo>/).
 * Always use this for internal links and assets: `href('/impressum/')`.
 */
export function href(path = '/'): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${base}${clean}`;
}
