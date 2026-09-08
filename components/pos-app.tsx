'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { amount, csvCell, parseBackup, taipeiDay } from '@/lib/pos-domain';
import type { Backup, CartLine, DiningType, MenuItem, Order } from '@/lib/pos-domain';
import { commitOrder, commitVoid, LEGACY_KEY, mergeBackup, openStore, readSnapshot, saveMenu } from '@/lib/pos-store';
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
    timeZone: 'Asia/Taipei', month: '2-digit', day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
}

const dateKey = taipeiDay;

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
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [draftMenu, setDraftMenu] = useState<MenuItem[]>(defaultMenu);
  const [menuRevision, setMenuRevision] = useState(0);
  const [draftRevision, setDraftRevision] = useState(0);
  const [backup, setBackup] = useState<Backup | null>(null);
  const [voidTarget, setVoidTarget] = useState<Order | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [printOrder, setPrintOrder] = useState<Order | null>(null);
  const dbRef = useRef<IDBDatabase | null>(null);
  const busyRef = useRef(false);
  const checkoutId = useRef<string | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);

  async function refresh() {
    if (!dbRef.current) return;
    const data = await readSnapshot(dbRef.current);
    setMenu(data.menu); setOrders(data.orders); setMenuRevision(data.menuRevision);
  }

  async function mutate(action: (db: IDBDatabase) => Promise<void>) {
    if (!dbRef.current || busyRef.current) return;
    busyRef.current = true; setBusy(true); setError(''); setNotice('');
    try { await action(dbRef.current); await refresh(); channelRef.current?.postMessage('updated'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : '操作失敗，請保留目前資料並重試。'); }
    finally { busyRef.current = false; setBusy(false); }
  }

  useEffect(() => {
    let cancelled = false;
    let connection: IDBDatabase | null = null;
    const load = async () => {
      try {
        connection = await openStore(defaultMenu, window.localStorage.getItem(LEGACY_KEY));
        if (cancelled) { connection.close(); return; }
        dbRef.current = connection;
        await refresh();
        if (!cancelled) setReady(true);
      } catch (cause) {
        if (!cancelled) setError(`無法載入帳本。原資料已保留。${cause instanceof Error ? cause.message : ''}`);
      }
    };
    void load();
    const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('smallshop-pos-v2') : null;
    channelRef.current = channel;
    const reload = () => { void refresh().catch(() => setError('無法重新讀取帳本。請先備份並重新載入。')); };
    if (channel) channel.onmessage = reload;
    window.addEventListener('focus', reload);
    return () => { cancelled = true; connection?.close(); channel?.close(); window.removeEventListener('focus', reload); };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!cart.length && !busy) return;
    // Suite navigation uses full document links. Let the browser protect an
    // unfinished order (and in-flight transaction) when switching tools.
    const protectOrder = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', protectOrder);
    return () => window.removeEventListener('beforeunload', protectOrder);
  }, [cart.length, busy]);

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
            if (busyRef.current || !dbRef.current) throw new Error('帳本尚未就緒或正在儲存。');
            if (!input || typeof input !== 'object') throw new Error('輸入格式不正確。');
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
              if (requested.withAddon !== undefined && typeof requested.withAddon !== 'boolean') throw new Error('加料選項不正確。');
              if (requested.withAddon && !item.addon) throw new Error('這個餐點沒有加料選項。');
              const addonName = requested.withAddon ? item.addon?.name : undefined;
              return {
                key: JSON.stringify([item.id, item.name, addonName ?? '', item.price, item.addon?.price ?? 0]),
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
                if (index >= 0) next[index] = { ...next[index], quantity: Math.min(999, next[index].quantity + addition.quantity) };
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
    () => orders.filter((order) => !order.voidedAt && dateKey(order.createdAt) === today),
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
    if (busyRef.current || !ready) return;
    const addonName = withAddon ? item.addon?.name : undefined;
    const key = JSON.stringify([item.id, item.name, addonName ?? '', item.price, item.addon?.price ?? 0]);
    setCart((current) => {
      const found = current.find((line) => line.key === key);
      if (found) {
        return current.map((line) =>
          line.key === key ? { ...line, quantity: Math.min(999, line.quantity + 1) } : line,
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
    if (busyRef.current) return;
    setCart((current) =>
      current
        .map((line) =>
          line.key === key ? { ...line, quantity: Math.min(999, line.quantity + amount) } : line,
        )
        .filter((line) => line.quantity > 0),
    );
  }

  function appendPaid(value: string) {
    if (busyRef.current) return;
    setPaidText((current) => (current + value).replace(/^0+(?=\d)/, '').slice(0, 6));
  }

  function checkout() {
    if (!cart.length) return;
    const finalPaid = paidText ? paid : total;
    checkoutId.current ??= crypto.randomUUID();
    const id = checkoutId.current;
    void mutate(async (db) => {
      const order = await commitOrder(db, id, cart, diningType, finalPaid);
      setLastOrder(order); setCart([]); setPaidText(''); setDiningType('外帶');
      checkoutId.current = null; setCheckoutOpen(true);
    });
  }

  function printReceipt(order: Order) {
    flushSync(() => setPrintOrder(order));
    window.print();
  }

  function exportCsv() {
    const header = ['訂單ID', '取餐號', '日期時間', '類型', '品項', '數量', '單價', '小計', '訂單總額（僅首列）', '收現（僅首列）', '狀態', '作廢原因'];
    const rows = orders.flatMap((order) =>
      order.lines.map((line, index) => [
        order.id,
        order.number,
        new Date(order.createdAt).toLocaleString('zh-TW'),
        order.diningType,
        line.name,
        line.quantity,
        line.unitPrice,
        line.unitPrice * line.quantity,
        index === 0 ? order.total : '',
        index === 0 ? order.paid : '',
        order.voidedAt ? '作廢' : '有效', order.voidReason ?? '',
      ]),
    );
    const csv = [header, ...rows]
      .map((row) => row.map(csvCell).join(','))
      .join('\n');
    download(`\uFEFF${csv}`, `小店快收_全部訂單_${today}.csv`, 'text/csv;charset=utf-8');
  }

  function download(content: string, name: string, type = 'application/json') {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function updateMenuItem(id: string, patch: Partial<MenuItem>) {
    setDraftMenu((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  async function exportBackup() {
    if (!dbRef.current) return;
    try {
      const data = await readSnapshot(dbRef.current);
      download(JSON.stringify({ format: 'smallshop-pos', version: 2, exportedAt: new Date().toISOString(), menu: data.menu, orders: data.orders }, null, 2), `小店快收_完整備份_${today}.json`);
      setNotice('備份檔已產生，請確認下載完成並另存一份到其他裝置。');
    } catch { setError('備份讀取失敗，請勿清除瀏覽器資料。'); }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark"><ReceiptText aria-hidden="true" /></div>
          <div>
            <p>小店快收</p>
            <span>產品展示・請勿輸入真實營業資料</span>
          </div>
        </div>
        <div className="topbar-center">
          <span><Clock3 aria-hidden="true" />{now.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
          <span className="offline-chip"><WifiOff aria-hidden="true" />資料僅存此裝置</span>
        </div>
        <div className="topbar-actions">
          <button className="icon-action" onClick={() => setReportOpen(true)}><BarChart3 aria-hidden="true" /><span>日報</span></button>
          <button className="icon-action" disabled={!ready || busy} onClick={() => { setDraftMenu(structuredClone(menu)); setDraftRevision(menuRevision); setSettingsOpen(true); }}><Settings2 aria-hidden="true" /><span>菜單</span></button>
        </div>
      </header>
      <div className="data-banner"><span>展示帳本僅存此瀏覽器，尚未提供雲端備份及離線重啟。正式營業需使用另行驗收的版本。</span><button disabled={!ready || busy} onClick={() => void exportBackup()}>完整備份</button><label>匯入備份<input type="file" accept=".json,application/json" disabled={!ready || busy} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (!file) return; if (file.size > 50 * 1024 * 1024) { setError('備份檔超過 50 MB。'); return; } void file.text().then((raw) => { setBackup(parseBackup(raw)); setError(''); }).catch(() => setError('備份內容不完整或格式不正確，尚未更動任何資料。')); }} /></label></div>
      {error && <div className="data-message error" role="alert">{error}{!ready && <button onClick={() => { try { download(window.localStorage.getItem(LEGACY_KEY) ?? '', '小店快收_原始資料_待修復.json'); } catch { setError('瀏覽器拒絕存取原始資料，請先解除儲存限制。'); } }}>下載原始資料</button>}</div>}
      {notice && <div className="data-message" role="status">{notice}</div>}

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
              <button className="pay-button" disabled={!ready || busy || !cart.length || (!!paidText && paid < total)} onClick={checkout}>{busy ? '儲存中…' : '完成結帳'}<ChevronRight /></button>
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
                    <strong>{order.voidedAt ? '已作廢' : money(order.total)}</strong>
                    <button aria-label={`列印訂單 ${order.number}`} onClick={() => printReceipt(order)}><Printer /></button>
                    {order.voidedAt ? <small>作廢原因：{order.voidReason}</small> : <button className="void-action" disabled={busy} onClick={() => { setVoidTarget(order); setVoidReason(''); }}>作廢</button>}
                  </article>
                )) : <p className="empty-report">尚無歷史訂單。</p>}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="settings-dialog">
          <DialogHeader><DialogTitle>菜單管理</DialogTitle><DialogDescription>改完後按「儲存菜單」。已加入購物車的品項保留原價格，後續加入使用新價格。</DialogDescription></DialogHeader>
          <div className="settings-list">
            {draftMenu.map((item) => (
              <div className="settings-row" key={item.id}>
                <span className="color-dot" style={{ background: item.accent }} />
                <div><input aria-label={`品名 ${item.name}`} value={item.name} maxLength={120} onChange={(event) => updateMenuItem(item.id, { name: event.target.value })} /><input aria-label={`分類 ${item.name}`} value={item.category} maxLength={120} onChange={(event) => updateMenuItem(item.id, { category: event.target.value })} /></div>
                <label><span>價格</span><input aria-label={`價格 ${item.name}`} type="number" min="0" max="999999" step="1" value={item.price} onChange={(event) => updateMenuItem(item.id, { price: event.target.value === '' ? Number.NaN : Number(event.target.value) })} /></label>
                <button className={item.available ? 'available' : ''} onClick={() => updateMenuItem(item.id, { available: !item.available })}>{item.available && <Check />} {item.available ? '販售中' : '已停售'}</button>
              </div>
            ))}
          </div>
          <div className="data-actions"><button onClick={() => setDraftMenu((current) => [...current, { id: crypto.randomUUID(), name: '新餐點', category: '主食', price: 0, available: true, accent: '#0f7057' }])}>新增品項</button><button disabled={busy} onClick={() => void mutate(async (db) => { draftMenu.forEach((item) => amount(item.price)); await saveMenu(db, draftMenu, draftRevision); setSettingsOpen(false); setNotice('菜單已儲存。'); })}>儲存菜單</button></div>
          {error && <p role="alert" className="inline-error">{error}</p>}
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

      <AlertDialog open={!!backup} onOpenChange={(open) => { if (!open) setBackup(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>匯入完整備份？</AlertDialogTitle><AlertDialogDescription>備份含 {backup?.orders.length} 筆訂單、{backup?.menu.length} 個品項。只補入缺少的訂單；若同一 ID 內容衝突，整份取消。菜單只在全新帳本還原。請先下載目前的完整備份。</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel><AlertDialogAction disabled={busy} onClick={() => { const input = backup; if (input) void mutate(async (db) => { const count = await mergeBackup(db, input); setBackup(null); setNotice(`備份匯入完成，新增 ${count} 筆訂單。`); }); }}>確認匯入</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <Dialog open={!!voidTarget} onOpenChange={(open) => { if (!open) setVoidTarget(null); }}><DialogContent><DialogHeader><DialogTitle>作廢訂單 #{voidTarget?.number}</DialogTitle><DialogDescription>保留原單與原因，並從原訂單日的有效營收扣除。此功能不會實際退款，不適用部分退款。</DialogDescription></DialogHeader><label>作廢原因<input className="reason-input" maxLength={200} value={voidReason} onChange={(event) => setVoidReason(event.target.value)} /></label><button className="confirm-void" disabled={busy || !voidReason.trim()} onClick={() => { const target = voidTarget; if (target) void mutate(async (db) => { await commitVoid(db, target.id, voidReason); setVoidTarget(null); setNotice('訂單已作廢，原始紀錄已保留。'); }); }}>確認作廢</button>{error && <p role="alert">{error}</p>}</DialogContent></Dialog>
      {ready && printOrder && createPortal(<div id="print-area"><h1>小店快收・展示單據</h1><p>{printOrder.diningType}・取餐號 {printOrder.number}{printOrder.voidedAt ? '（作廢）' : ''}</p><hr />{printOrder.lines.map((line) => <div className="print-line" key={line.key}><span>{line.name} × {line.quantity}</span><strong>{money(line.unitPrice * line.quantity)}</strong></div>)}<hr /><div className="print-total"><span>合計</span><strong>{money(printOrder.total)}</strong></div><p>收現 {money(printOrder.paid)}・找零 {money(printOrder.paid - printOrder.total)}</p><small>{timeLabel(printOrder.createdAt)}・非統一發票</small></div>, document.body)}
      {!ready && !error && <div className="loading-screen"><Store /><span>載入小店快收</span></div>}
    </main>
  );
}
