export const PAGES_BASE = '/smallshop-pos-tw/';
export const SITE_URL = 'https://smallshop-pos-tw.taiwanape1.chatgpt.site/';

export function staticTarget(name = 'pages') {
  if (name === 'pages')
    return {
      base: PAGES_BASE,
      output: 'dist-pages',
      url: 'https://taiwanape.github.io/smallshop-pos-tw/',
    };
  if (name === 'site') return { base: '/', output: 'out', url: SITE_URL };
  throw new Error(`Unknown static target: ${name}`);
}

// Rebase only local, root-relative strings. Attribution links and remote URLs
// containing the repository name must remain intact.
export function rebaseLexi(text, base = PAGES_BASE) {
  return text.replace(/(['"])\/lexiharbor(?=\/|['"])/g, `$1${base}lexiharbor`);
}
