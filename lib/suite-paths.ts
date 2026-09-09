declare const __SUITE_STATIC__: boolean;
declare const __SUITE_BASE__: string;
declare const __SUITE_PUBLIC_URL__: string | null;

export type ToolRoute = 'home' | 'classroom' | 'learn' | 'pos';
export const STATIC_SUITE =
  typeof __SUITE_STATIC__ !== 'undefined' && __SUITE_STATIC__;
export const SUITE_BASE =
  typeof __SUITE_BASE__ !== 'undefined' ? __SUITE_BASE__ : '/';
export const SUITE_VERSION = '2026.09.09-members1';
export const SUITE_PUBLIC_URL =
  typeof __SUITE_PUBLIC_URL__ !== 'undefined'
    ? __SUITE_PUBLIC_URL__
    : 'https://daily-tools.taiwanape.workers.dev/';
export const toolHref = (route: ToolRoute) =>
  STATIC_SUITE
    ? `#/${route === 'home' ? '' : route}`
    : route === 'home'
      ? '/'
      : `/${route}`;
export const suiteAsset = (path: string) =>
  `${SUITE_BASE}${path.replace(/^\//, '')}`;
export function parseToolRoute(hash: string): ToolRoute {
  const route = hash.split('?')[0];
  if (route === '#/classroom') return 'classroom';
  if (route === '#/learn') return 'learn';
  if (route === '#/pos' || route === '#/demo') return 'pos';
  return 'home';
}
