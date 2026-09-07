export const PUBLIC_PREVIEW_VERSION = '2026.09.07-3';
export const PUBLIC_PREVIEW_URL = 'https://taiwanape.github.io/smallshop-pos-tw/';

export const sampleMenu = [
  { id: 'noodles', name: '招牌乾麵', category: '主食', price: 55 },
  { id: 'greens', name: '燙青菜', category: '小菜', price: 45 },
  { id: 'tea', name: '古早味紅茶', category: '飲品', price: 30 },
] as const;

export type SampleItemId = (typeof sampleMenu)[number]['id'];
export type SampleQuantities = Record<SampleItemId, number>;

export function previewRoute(hash: string): 'home' | 'demo' {
  return hash === '#/demo' || hash.startsWith('#/demo?') ? 'demo' : 'home';
}

export function sampleTotal(quantities: SampleQuantities): number {
  return sampleMenu.reduce((total, item) => {
    const quantity = quantities[item.id];
    if (!Number.isInteger(quantity) || quantity < 0 || quantity > 9) throw new Error('範例數量須為 0 到 9。');
    return total + quantity * item.price;
  }, 0);
}
