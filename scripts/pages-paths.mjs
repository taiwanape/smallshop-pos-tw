export const PAGES_BASE = '/smallshop-pos-tw/';
export const SITE_URL = 'https://smallshop-pos-tw.taiwanape1.chatgpt.site/';

export function deploymentUrl(raw) {
  if (!raw) return null;
  const url = new URL(raw);
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/'
  ) {
    throw new Error(
      'PUBLIC_SITE_URL must be an HTTPS origin without credentials, paths or query strings',
    );
  }
  return `${url.origin}/`;
}

export function staticTarget(
  name = 'pages',
  publicUrl = process.env.PUBLIC_SITE_URL,
) {
  if (name === 'pages')
    return {
      base: PAGES_BASE,
      output: 'dist-pages',
      url: 'https://taiwanape.github.io/smallshop-pos-tw/',
    };
  if (name === 'site') return { base: '/', output: 'out', url: SITE_URL };
  if (name === 'cloudflare')
    return {
      base: '/',
      output: 'dist-cloudflare',
      url: deploymentUrl(publicUrl),
    };
  throw new Error(`Unknown static target: ${name}`);
}

// Rebase only local, root-relative strings. Attribution links and remote URLs
// containing the repository name must remain intact.
export function rebaseLexi(text, base = PAGES_BASE) {
  return text.replace(/(['"])\/lexiharbor(?=\/|['"])/g, `$1${base}lexiharbor`);
}
