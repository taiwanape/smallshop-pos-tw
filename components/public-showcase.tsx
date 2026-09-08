'use client';

import { lazy, Suspense, useEffect, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, Check, CheckCheck, ChevronRight, Clipboard, Coffee, ExternalLink, FileDown, Keyboard, Minus, MousePointer2, Plus, ReceiptText, ShieldCheck, Soup, Store, Utensils, Wallet } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { PUBLIC_PREVIEW_URL, PUBLIC_PREVIEW_VERSION, previewRoute, sampleMenu, sampleTotal } from '@/lib/public-preview';
import type { SampleItemId, SampleQuantities } from '@/lib/public-preview';

const PosDemo = lazy(() => import('@/components/pos-app'));
const github = 'https://github.com/taiwanape/smallshop-pos-tw';

const questions = [
  ['我可以把這個網址傳給別人嗎？', '可以。這是公開的 GitHub Pages 網站，任何人都能開啟產品介紹和操作體驗，不需要 GitHub、ChatGPT 帳號，也不需要申請觀看權限。'],
  ['體驗版可以做哪些事？', '使用範例菜單點餐、加料、切換內用外帶、模擬收現與找零；也能看訂單、修改菜單、下載 CSV 和備份。模擬結帳不會扣款。'],
  ['現在可以直接拿來正式營業嗎？', '還不可以。這裡是供評估操作流程的產品預覽，不是已完成驗收的商用 POS。正式帳號、雲端備份、完整退款、日結與設備驗收尚待完成，目前沒有販售或扣款。'],
  ['我的試用資料存在哪裡？', '完整體驗的訂單與菜單只存在你目前瀏覽器的本機儲存空間，不會傳給其他訪客，也沒有雲端同步。清除瀏覽器資料可能會遺失紀錄，請先使用完整備份。首頁的小範例不保存資料。'],
  ['手機能看嗎？需要安裝 App 嗎？', '手機可以看介紹和試點。完整點餐介面在較大的螢幕上更方便；直接使用瀏覽器即可，不必安裝 App。實際營業使用的裝置仍須另行驗收。'],
  ['可以列印、開發票或離線使用嗎？', '目前提供瀏覽器列印範例收據，不是統一發票。熱感印表機、電子發票及斷網後重新開啟尚未完成驗收，這個版本不承諾支援。'],
];

function Brand() {
  return <span className="showcase-brand"><span className="showcase-logo"><ReceiptText aria-hidden="true" /></span><span>小店快收<span className="brand-english">SMALLSHOP POS</span></span></span>;
}

function LiveOrder() {
  const [quantities, setQuantities] = useState<SampleQuantities>({ noodles: 1, greens: 0, tea: 1 });
  const total = sampleTotal(quantities);
  function change(id: SampleItemId, increment: number) { setQuantities((current) => ({ ...current, [id]: Math.max(0, Math.min(9, current[id] + increment)) })); }
  return <div className="live-order" aria-label="可操作的點餐範例">
    <div className="live-title"><span><span className="status-dot" /> 小店的日常</span><span>範例店・外帶</span></div>
    <div className="live-instruction"><MousePointer2 aria-hidden="true" /><span>這裡真的可以點，試著加一份。</span></div>
    <div className="live-menu">
      {sampleMenu.map((item, index) => <div className={`live-item live-item-${index}`} key={item.id}>
        <button className="live-item-main" onClick={() => change(item.id, 1)} disabled={quantities[item.id] === 9} aria-label={`加入${item.name}`}>
          <span className="live-item-icon">{index === 0 ? <Soup /> : index === 1 ? <Utensils /> : <Coffee />}</span>
          <span className="live-item-name"><small>{item.category}</small><strong>{item.name}</strong></span><b>${item.price}</b>
        </button>
        <div className="live-quantity"><span>數量</span><div><button aria-label={`減少${item.name}`} onClick={() => change(item.id, -1)} disabled={quantities[item.id] === 0}><Minus /></button><output aria-label={`${item.name}數量`}>{quantities[item.id]}</output><button aria-label={`增加${item.name}`} onClick={() => change(item.id, 1)} disabled={quantities[item.id] === 9}><Plus /></button></div></div>
      </div>)}
    </div>
    <div className="live-total" aria-live="polite"><div><span>這張訂單</span><strong>NT$ {total}</strong></div><span><CheckCheck /> 金額跟著你點的品項更新</span></div>
    <a className="live-next" href="#/demo">接著試試加料、找零與完成訂單 <ArrowRight /></a>
    <div className="live-foot"><ShieldCheck /> 範例操作，不會扣款，也不會送出真實訂單</div>
  </div>;
}

function ShareButton({ className = '' }: { className?: string }) {
  const [copied, setCopied] = useState(false);
  const [fallback, setFallback] = useState(false);
  async function share() {
    try { await navigator.clipboard.writeText(PUBLIC_PREVIEW_URL); setCopied(true); setFallback(false); }
    catch { setFallback(true); }
  }
  useEffect(() => { if (!copied) return; const timer = window.setTimeout(() => setCopied(false), 3000); return () => window.clearTimeout(timer); }, [copied]);
  return <div className="share-control"><button className={`showcase-button secondary ${className}`} onClick={() => void share()}>{copied ? <Check /> : <Clipboard />}{copied ? '網址已複製' : '複製網址，傳給朋友'}</button><span className="sr-only" role="status">{copied ? '公開網站網址已複製' : ''}</span>{fallback && <label className="share-fallback">請長按或選取網址複製<input readOnly value={PUBLIC_PREVIEW_URL} onFocus={(event) => event.target.select()} /></label>}</div>;
}

export default function PublicShowcase() {
  const [route, setRoute] = useState<'home' | 'demo'>('home');
  useEffect(() => {
    const sync = () => { const next = previewRoute(window.location.hash); setRoute(next); if (next === 'demo' || window.location.hash === '#/') window.scrollTo(0, 0); };
    sync(); window.addEventListener('hashchange', sync); return () => window.removeEventListener('hashchange', sync);
  }, []);
  useEffect(() => { document.title = route === 'demo' ? '免登入操作體驗｜小店快收' : '小店快收｜點餐、加料、找零，一眼清楚'; }, [route]);

  if (route === 'demo') return <div className="public-demo">
    <div className="demo-topline"><a href="#/"><ArrowLeft /> 回產品介紹</a><span>公開操作體驗・免登入・不會扣款</span><span className="demo-version">v{PUBLIC_PREVIEW_VERSION}</span></div>
    <div className="demo-guide"><strong>第一次試？</strong><span><b>1</b> 點招牌乾麵</span><span><b>2</b> 試著加蛋或改數量</span><span><b>3</b> 輸入足夠現金，按完成結帳</span></div>
    <Suspense fallback={<div className="demo-loading" role="status">正在開啟點餐體驗…</div>}><PosDemo /></Suspense>
  </div>;

  return <div className="public-showcase" data-version={PUBLIC_PREVIEW_VERSION}>
    <a href="#main" className="showcase-skip">跳到內容</a>
    <header className="showcase-header"><div className="showcase-width"><a href="#/" aria-label="小店快收首頁"><Brand /></a><nav aria-label="主要導覽"><a href="#features">能做什麼</a><a href="#how">怎麼開始</a><a href="#questions">常見問題</a></nav><a href="#/demo" className="header-try">直接試用 <ArrowUpRight /></a></div></header>
    <main id="main">
      <section className="showcase-hero showcase-width">
        <div className="hero-copy"><div className="hero-kicker"><span /> 給小吃店的一張點餐工作台</div><h1>點餐、加料、找零。<br /><em>一眼就清楚。</em></h1><p>大按鈕點品項，金額自動算好。<br />從一碗麵到一張收據，先親手試過再決定。</p><div className="hero-actions"><a href="#/demo" className="showcase-button primary">不用註冊，直接試用 <ArrowRight /></a><a href="#features" className="hero-more">先看功能 <ArrowDown /></a></div><div className="hero-assurances"><span><Check /> 不用安裝</span><span><Check /> 不用登入</span><span><Check /> 不會扣款</span></div><div className="hero-release"><span>公開產品預覽</span>新版 v{PUBLIC_PREVIEW_VERSION} <a href="#status">查看目前支援範圍</a></div></div>
        <div className="hero-product"><div className="product-caption"><span>LESS CALCULATING. MORE SERVING.</span><span>01 / 03</span></div><LiveOrder /></div>
      </section>

      <section className="showcase-audience"><div className="showcase-width"><span>先把一間小店的日常做好</span><div><span><Store /> 單櫃台小吃店</span><span><Soup /> 麵食・飯食</span><span><Wallet /> 現金點餐流程</span></div></div></section>

      <section id="features" className="showcase-width showcase-section"><div className="section-intro"><span className="section-label">從點單到紀錄</span><h2>常用的事，<br />放在順手的位置。</h2><p>不必先讀一本說明書。<br />打開範例店，就能把整個流程走一遍。</p></div><div className="feature-grid">
        <article className="showcase-feature"><span className="feature-number">01</span><div className="feature-visual addition"><span>招牌乾麵 <b>$55</b></span><span><Plus /> 加蛋 <b>$15</b></span><strong>這一份 $70 <Check /></strong></div><h3>品項與加料，一起看清楚</h3><p>主食、小菜、湯品分開找。內用外帶、數量和加料，直接在點餐畫面調整。</p></article>
        <article className="showcase-feature"><span className="feature-number">02</span><div className="feature-visual change"><div><span>應收</span><b>$70</b></div><div><span>收到</span><b>$100</b></div><div><span>找給客人</span><strong>$30</strong></div></div><h3>收多少、找多少，不用心算</h3><p>輸入收到的現金，即時顯示找零。完成結帳後，才建立訂單與取餐號。</p></article>
        <article className="showcase-feature"><span className="feature-number">03</span><div className="feature-visual records"><div><ReceiptText /><span>訂單紀錄</span><Check /></div><div><FileDown /><span>匯出 CSV</span><Check /></div><div><ShieldCheck /><span>下載完整備份</span><Check /></div></div><h3>點過的單，有紀錄可回看</h3><p>查看當日訂單、品項與有效營收；模擬作廢保留原因，也能將紀錄下載保存。</p></article>
      </div></section>

      <section id="how" className="showcase-how"><div className="showcase-width"><div className="how-heading"><span className="section-label">先試一張單</span><h2>不用留資料。<br />打開，就開始。</h2><a href="#/demo" className="showcase-button light">開啟完整體驗 <ArrowRight /></a></div><ol className="how-steps"><li><span>1</span><div><h3>打開範例小店</h3><p>菜單已準備好，不需要先註冊或填店名。</p></div></li><li><span>2</span><div><h3>點餐，試算找零</h3><p>點一碗麵、加顆蛋，看看操作適不適合你。</p></div></li><li><span>3</span><div><h3>看看訂單與報表</h3><p>完成模擬結帳後，到營收報表查看這張單。</p></div></li></ol></div></section>

      <section id="status" className="showcase-width showcase-section status-section"><div><span className="section-label">進度透明，先把界線說清楚</span><h2>現在可以試什麼？</h2><p>這是公開、免費的產品預覽。<br />目前不販售、不收款，也不接收真實營業訂單。</p></div><div className="status-grid"><article><span className="status-label ready"><Check /> 已提供操作體驗</span><ul><li>點餐、加料、內用外帶</li><li>模擬收現、找零與取餐號</li><li>本機訂單、營收與菜單管理</li><li>CSV、JSON 備份與模擬作廢</li></ul></article><article><span className="status-label planned"><Keyboard /> 正式版待完成與驗收</span><ul><li>店家帳號與雲端資料隔離</li><li>付款訂閱、退款與現金日結</li><li>雲端恢復與離線重新開啟</li><li>營業設備與印表機相容性</li></ul></article></div></section>

      <section id="questions" className="showcase-width showcase-section faq-section"><div><span className="section-label">先回答你可能想問的</span><h2>常見問題</h2><p>不確定能不能用？<br />先看看目前的功能與限制。</p></div><Accordion className="showcase-faq">{questions.map(([question, answer], index) => <AccordionItem value={index} key={question}><AccordionTrigger>{question}</AccordionTrigger><AccordionContent><p>{answer}</p></AccordionContent></AccordionItem>)}</Accordion></section>

      <section className="showcase-final"><div className="showcase-width"><span className="section-label">下一張單，換你點。</span><h2>不用想像，<br />現在就試一次。</h2><div className="final-actions"><a href="#/demo" className="showcase-button primary">進入點餐體驗 <ArrowRight /></a><ShareButton /></div><p>公開網址可以直接分享，對方不用登入任何帳號。</p></div></section>
    </main>
    <footer className="showcase-footer showcase-width"><Brand /><span>公開產品預覽 v{PUBLIC_PREVIEW_VERSION}</span><div><a href={`${github}/blob/main/README.md`}>專案與支援範圍 <ExternalLink /></a><a href={`${github}/blob/main/docs/public-preview.md`}>版本更新 <ChevronRight /></a></div></footer>
  </div>;
}

function ArrowUpRight() { return <ArrowRight className="arrow-diagonal" aria-hidden="true" />; }
