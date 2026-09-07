'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Check,
  ChevronRight,
  Clock3,
  Download,
  Minus,
  Plus,
  Printer,
  ReceiptText,
  Settings2,
  Store,
  Trash2,
  Utensils,
  WifiOff,
} from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type DiningType = '外帶' | '內用';

type MenuItem = {
  id: string;
  name: string;
  price: number;
  category: string;
  accent: string;
  available: boolean;
  addon?: { name: string; price: number };
};

type CartLine = {
  key: string;
  menuId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  addonName?: string;
};

type Order = {
  id: string;
  number: number;
  createdAt: string;
  diningType: DiningType;
  lines: CartLine[];
  total: number;
  paid: number;
};

type WebMcpContext = {
  registerTool: (
    tool: {
      name: string;
      title: string;
      description: string;
      inputSchema: object;
      annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
      execute: (input: unknown) => unknown;
    },
    options?: { signal?: AbortSignal },
  ) => void | Promise<void>;
};

const STORAGE_KEY = 'smallshop-pos-demo-v1';

const defaultMenu: MenuItem[] = [
  { id: 'm1', name: '招牌乾麵', price: 55, category: '主食', accent: '#ef5b2a', available: true, addon: { name: '加蛋', price: 15 } },
  { id: 'm2', name: '肉燥飯', price: 45, category: '主食', accent: '#f2a51a', available: true, addon: { name: '加蛋', price: 15 } },
  { id: 'm3', name: '紅油抄手', price: 70, category: '主食', accent: '#e84242', available: true },
  { id: 'm4', name: '麻醬麵', price: 60, category: '主食', accent: '#e07b21', available: true },
  { id: 'm5', name: '燙青菜', price: 45, category: '小菜', accent: '#238b57', available: true },
  { id: 'm6', name: '滷味拼盤', price: 75, category: '小菜', accent: '#955b33', available: true },
  { id: 'm7', name: '皮蛋豆腐', price: 50, category: '小菜', accent: '#357b78', available: true },
  { id: 'm8', name: '黃金泡菜', price: 45, category: '小菜', accent: '#c79016', available: true },
  { id: 'm9', name: '貢丸湯', price: 45, category: '湯品', accent: '#236b9e', available: true },
  { id: 'm10', name: '餛飩湯', price: 55, category: '湯品', accent: '#5169a7', available: true },
  { id: 'm11', name: '古早味紅茶', price: 30, category: '飲品', accent: '#a24c3f', available: true },
  { id: 'm12', name: '冬瓜檸檬', price: 40, category: '飲品', accent: '#4e8c45', available: true },
];

function money(value: number) {
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    maximumFractionDigits: 0,
  }).format(value);
}

function timeLabel(value: string) {
  return new Intl.DateTimeFormat('zh-TW', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
}

function dateKey(value: string) {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));
}

export default function Home() {
  const [menu, setMenu] = useState<MenuItem[]>(defaultMenu);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [diningType, setDiningType] = useState<DiningType>('外帶');
  const [paidText, setPaidText] = useState('');
  const [category, setCategory] = useState('全部');
  const [reportOpen, setReportOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    queueMicrotask(() => {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const data = JSON.parse(stored) as { menu?: MenuItem[]; orders?: Order[] };
          if (Array.isArray(data.menu)) setMenu(data.menu);
          if (Array.isArray(data.orders)) setOrders(data.orders);
        } catch {
          window.localStorage.removeItem(STORAGE_KEY);
        }
      }
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ menu, orders }));
  }, [menu, orders, ready]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const context = (document as Document & { modelContext?: WebMcpContext }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(
      context.registerTool(
        {
          name: 'add_items_to_order',
          title: '加入餐點',
          description: '依菜單 ID 將一個或多個餐點加入目前可見的點單。',
          inputSchema: {
            type: 'object',
            properties: {
              items: {
                type: 'array',
                minItems: 1,
                items: {
                  type: 'object',
                  properties: {
                    menuId: { type: 'string' },
                    quantity: { type: 'integer', minimum: 1, maximum: 20 },
                    withAddon: { type: 'boolean' },
                  },
                  required: ['menuId', 'quantity'],
                  additionalProperties: false,
                },
              },
            },
            required: ['items'],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false, untrustedContentHint: false },
          execute(input) {
            const request = input as { items?: Array<{ menuId?: string; quantity?: number; withAddon?: boolean }> };
            if (!Array.isArray(request.items) || request.items.length === 0) {
              throw new Error('至少需要一個餐點。');
            }
            const additions: CartLine[] = request.items.map((requested) => {
              const item = menu.find((candidate) => candidate.id === requested.menuId && candidate.available);
              const quantity = Number(requested.quantity);
              if (!item || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
                throw new Error('菜單 ID 或數量不正確。');
              }
              const addonName = requested.withAddon ? item.addon?.name : undefined;
              return {
                key: `${item.id}:${addonName ?? 'base'}`,
                menuId: item.id,
                name: addonName ? `${item.name}（${addonName}）` : item.name,
                unitPrice: item.price + (addonName ? item.addon?.price ?? 0 : 0),
                quantity,
                addonName,
              };
            });
            setCart((current) => {
              const next = [...current];
              additions.forEach((addition) => {
                const index = next.findIndex((line) => line.key === addition.key);
                if (index >= 0) next[index] = { ...next[index], quantity: next[index].quantity + addition.quantity };
                else next.push(addition);
              });
              return next;
            });
            return { addedLineCount: additions.length };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => undefined);
    return () => lifecycle.abort();
  }, [menu]);

  const categories = useMemo(
    () => ['全部', ...Array.from(new Set(menu.map((item) => item.category)))],
    [menu],
  );
  const visibleMenu = menu.filter(
    (item) => item.available && (category === '全部' || item.category === category),
  );
  const total = cart.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const paid = Number.parseInt(paidText, 10) || 0;
  const change = paidText ? paid - total : 0;
  const today = dateKey(new Date().toISOString());
  const todayOrders = useMemo(
    () => orders.filter((order) => dateKey(order.createdAt) === today),
    [orders, today],
  );
  const todayRevenue = todayOrders.reduce((sum, order) => sum + order.total, 0);

  const itemSales = useMemo(() => {
    const result = new Map<string, { quantity: number; revenue: number }>();
    todayOrders.forEach((order) => {
      order.lines.forEach((line) => {
        const current = result.get(line.name) ?? { quantity: 0, revenue: 0 };
        current.quantity += line.quantity;
        current.revenue += line.quantity * line.unitPrice;
        result.set(line.name, current);
      });
    });
    return Array.from(result.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.quantity - a.quantity);
  }, [todayOrders]);

  function addItem(item: MenuItem, withAddon = false) {
    const addonName = withAddon ? item.addon?.name : undefined;
    const key = `${item.id}:${addonName ?? 'base'}`;
    setCart((current) => {
      const found = current.find((line) => line.key === key);
      if (found) {
        return current.map((line) =>
          line.key === key ? { ...line, quantity: line.quantity + 1 } : line,
        );
      }
      return [
        ...current,
        {
          key,
          menuId: item.id,
          name: addonName ? `${item.name}（${addonName}）` : item.name,
          unitPrice: item.price + (withAddon ? item.addon?.price ?? 0 : 0),
          quantity: 1,
          addonName,
        },
      ];
    });
  }

  function adjustQuantity(key: string, amount: number) {
    setCart((current) =>
      current
        .map((line) =>
          line.key === key ? { ...line, quantity: line.quantity + amount } : line,
        )
        .filter((line) => line.quantity > 0),
    );
  }

  function appendPaid(value: string) {
    setPaidText((current) => (current + value).replace(/^0+(?=\d)/, '').slice(0, 6));
  }

  function checkout() {
    if (!cart.length) return;
    const finalPaid = paidText ? paid : total;
    const order: Order = {
      id: crypto.randomUUID(),
      number: (orders[0]?.number ?? 0) + 1,
      createdAt: new Date().toISOString(),
      diningType,
      lines: cart,
      total,
      paid: finalPaid,
    };
    setOrders((current) => [order, ...current]);
    setLastOrder(order);
    setCart([]);
    setPaidText('');
    setDiningType('外帶');
    setCheckoutOpen(true);
  }

  function printReceipt(order: Order) {
    const body = order.lines
      .map(
        (line) =>
          `<div class="print-line"><span>${line.name} × ${line.quantity}</span><strong>${money(line.unitPrice * line.quantity)}</strong></div>`,
      )
      .join('');
    const area = document.getElementById('print-area');
    if (!area) return;
    area.innerHTML = `<h1>小店快收</h1><p>${order.diningType}・取餐號 ${String(order.number).padStart(3, '0')}</p><hr>${body}<hr><div class="print-total"><span>合計</span><strong>${money(order.total)}</strong></div><p>收現 ${money(order.paid)}・找零 ${money(order.paid - order.total)}</p><small>${new Date(order.createdAt).toLocaleString('zh-TW')}</small>`;
    window.print();
  }

  function exportCsv() {
    const header = ['取餐號', '日期時間', '類型', '品項', '數量', '單價', '小計', '訂單總額'];
    const rows = orders.flatMap((order) =>
      order.lines.map((line) => [
        order.number,
        new Date(order.createdAt).toLocaleString('zh-TW'),
        order.diningType,
        line.name,
        line.quantity,
        line.unitPrice,
        line.unitPrice * line.quantity,
        order.total,
      ]),
    );
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `小店快收_${today}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function updateMenuItem(id: string, patch: Partial<MenuItem>) {
    setMenu((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark"><ReceiptText aria-hidden="true" /></div>
          <div>
            <p>小店快收</p>
            <span>快速點單・本機示範版</span>
          </div>
        </div>
        <div className="topbar-center">
          <span><Clock3 aria-hidden="true" />{now.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
          <span className="offline-chip"><WifiOff aria-hidden="true" />資料僅存此裝置</span>
        </div>
        <div className="topbar-actions">
          <button className="icon-action" onClick={() => setReportOpen(true)}><BarChart3 aria-hidden="true" /><span>日報</span></button>
          <button className="icon-action" onClick={() => setSettingsOpen(true)}><Settings2 aria-hidden="true" /><span>菜單</span></button>
        </div>
      </header>

      <section className="workspace">
        <div className="menu-panel">
          <div className="category-strip" aria-label="餐點分類">
            {categories.map((name) => (
              <button key={name} className={name === category ? 'active' : ''} onClick={() => setCategory(name)}>{name}</button>
            ))}
          </div>
          <div className="menu-grid">
            {visibleMenu.map((item) => (
              <article key={item.id} className="menu-card" style={{ '--accent': item.accent } as React.CSSProperties}>
                <button className="menu-card-main" onClick={() => addItem(item)}>
                  <span className="menu-category">{item.category}</span>
                  <strong>{item.name}</strong>
                  <span className="menu-price">{money(item.price)}</span>
                </button>
                {item.addon && (
                  <button className="addon-button" onClick={() => addItem(item, true)}>
                    <Plus aria-hidden="true" />{item.addon.name} {money(item.addon.price)}
                  </button>
                )}
              </article>
            ))}
          </div>
        </div>

        <aside className="cart-panel">
          <div className="cart-title-row">
            <div><span className="eyebrow">目前訂單</span><h1>{diningType}點單</h1></div>
            <div className="dining-switch" aria-label="用餐方式">
              {(['外帶', '內用'] as DiningType[]).map((type) => (
                <button key={type} className={diningType === type ? 'active' : ''} onClick={() => setDiningType(type)}>{type}</button>
              ))}
            </div>
          </div>

          <div className="cart-list">
            {cart.length === 0 ? (
              <div className="empty-cart"><Utensils aria-hidden="true" /><strong>點一下左側餐點開始</strong><span>相同品項會自動合併數量</span></div>
            ) : (
              cart.map((line) => (
                <div className="cart-line" key={line.key}>
                  <div className="cart-line-copy"><strong>{line.name}</strong><span>{money(line.unitPrice)} / 份</span></div>
                  <div className="stepper">
                    <button aria-label={`減少 ${line.name}`} onClick={() => adjustQuantity(line.key, -1)}><Minus /></button>
                    <strong>{line.quantity}</strong>
                    <button aria-label={`增加 ${line.name}`} onClick={() => adjustQuantity(line.key, 1)}><Plus /></button>
                  </div>
                  <strong className="line-total">{money(line.unitPrice * line.quantity)}</strong>
                </div>
              ))
            )}
          </div>

          <div className="checkout-panel">
            <div className="total-row"><span>合計</span><strong>{money(total)}</strong></div>
            <div className="payment-row">
              <div><span>收現</span><strong>{paidText ? money(paid) : '直接結帳'}</strong></div>
              <div className={change < 0 ? 'negative' : ''}><span>找零</span><strong>{money(change)}</strong></div>
            </div>
            <div className="numpad" aria-label="收現金額">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '清除', '0', '←'].map((key) => (
                <button key={key} onClick={() => key === '清除' ? setPaidText('') : key === '←' ? setPaidText((value) => value.slice(0, -1)) : appendPaid(key)}>{key}</button>
              ))}
            </div>
            <div className="checkout-actions">
              <button className="clear-cart" disabled={!cart.length} onClick={() => setClearOpen(true)}><Trash2 />清空</button>
              <button className="pay-button" disabled={!cart.length || (!!paidText && paid < total)} onClick={checkout}>完成結帳<ChevronRight /></button>
            </div>
          </div>
        </aside>
      </section>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="report-dialog">
          <DialogHeader>
            <DialogTitle>營業紀錄</DialogTitle>
            <DialogDescription>今日營收、熱銷品項與本機歷史訂單。</DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="today">
            <TabsList><TabsTrigger value="today">今日摘要</TabsTrigger><TabsTrigger value="history">歷史訂單</TabsTrigger></TabsList>
            <TabsContent value="today" className="report-content">
              <div className="report-kpis"><div><span>今日營收</span><strong>{money(todayRevenue)}</strong></div><div><span>完成訂單</span><strong>{todayOrders.length}</strong></div><div><span>平均客單</span><strong>{money(todayOrders.length ? Math.round(todayRevenue / todayOrders.length) : 0)}</strong></div></div>
              <div className="report-table">
                <div className="table-head"><span>品項</span><span>份數</span><span>銷售額</span></div>
                {itemSales.length ? itemSales.map((item) => <div key={item.name}><strong>{item.name}</strong><span>{item.quantity}</span><span>{money(item.revenue)}</span></div>) : <p className="empty-report">今天還沒有訂單。</p>}
              </div>
            </TabsContent>
            <TabsContent value="history" className="report-content">
              <div className="history-toolbar"><span>共 {orders.length} 筆訂單</span><button onClick={exportCsv} disabled={!orders.length}><Download />匯出 CSV</button></div>
              <div className="history-list">
                {orders.length ? orders.map((order) => (
                  <article key={order.id} className="history-card">
                    <div><span className="order-number">#{String(order.number).padStart(3, '0')}</span><span>{timeLabel(order.createdAt)}・{order.diningType}</span></div>
                    <div className="history-items">{order.lines.map((line) => `${line.name} ×${line.quantity}`).join('、')}</div>
                    <strong>{money(order.total)}</strong>
                    <button aria-label={`列印訂單 ${order.number}`} onClick={() => printReceipt(order)}><Printer /></button>
                  </article>
                )) : <p className="empty-report">尚無歷史訂單。</p>}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="settings-dialog">
          <DialogHeader><DialogTitle>菜單管理</DialogTitle><DialogDescription>調整示範菜單價格與販售狀態，變更會儲存在這台裝置。</DialogDescription></DialogHeader>
          <div className="settings-list">
            {menu.map((item) => (
              <div className="settings-row" key={item.id}>
                <span className="color-dot" style={{ background: item.accent }} />
                <div><strong>{item.name}</strong><span>{item.category}</span></div>
                <label><span>價格</span><input type="number" min="0" step="5" value={item.price} onChange={(event) => updateMenuItem(item.id, { price: Number(event.target.value) || 0 })} /></label>
                <button className={item.available ? 'available' : ''} onClick={() => updateMenuItem(item.id, { available: !item.available })}>{item.available && <Check />} {item.available ? '販售中' : '已停售'}</button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="checkout-dialog">
          <DialogHeader><DialogTitle>結帳完成</DialogTitle><DialogDescription>訂單已儲存到這台裝置。</DialogDescription></DialogHeader>
          {lastOrder && <div className="checkout-success"><div className="success-check"><Check /></div><span>{lastOrder.diningType}・取餐號</span><strong>#{String(lastOrder.number).padStart(3, '0')}</strong><div className="success-total"><span>找零</span><strong>{money(lastOrder.paid - lastOrder.total)}</strong></div><button onClick={() => printReceipt(lastOrder)}><Printer />列印收據</button></div>}
        </DialogContent>
      </Dialog>

      <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>清空目前訂單？</AlertDialogTitle><AlertDialogDescription>購物車內的餐點會全部移除。</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>保留訂單</AlertDialogCancel><AlertDialogAction onClick={() => { setCart([]); setPaidText(''); }}>清空</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div id="print-area" aria-hidden="true" />
      {!ready && <div className="loading-screen"><Store /><span>載入小店快收</span></div>}
    </main>
  );
}
