export const PAGES_BASE = '/smallshop-pos-tw/';

// Rebase only local, root-relative strings. Attribution links and remote URLs
// containing the repository name must remain intact.
export function rebaseLexi(text) {
  return text.replace(
    /(['"])\/lexiharbor(?=\/|['"])/g,
    `$1${PAGES_BASE}lexiharbor`,
  );
}
