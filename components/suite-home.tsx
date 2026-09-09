'use client';

import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  GraduationCap,
  Monitor,
  Plus,
  ReceiptText,
  ShieldCheck,
  Store,
  Volume2,
} from 'lucide-react';
import { SuiteNav } from '@/components/suite-nav';
import { suiteAsset, toolHref } from '@/lib/suite-paths';

const tools = [
  {
    id: 'classroom' as const,
    name: '班級小夥伴',
    label: '班級管理',
    copy: '名單、點名、積分和小夥伴養成。把每一次努力，變成看得見的成長。',
    action: '開啟班級',
    icon: GraduationCap,
  },
  {
    id: 'learn' as const,
    name: '英文學習室',
    label: 'LexiHarbor',
    copy: '讀文章、查單字，把原句收進字卡。閱讀、發音與複習，在同一個地方完成。',
    action: '開始閱讀',
    icon: BookOpen,
  },
  {
    id: 'pos' as const,
    name: '小店快收',
    label: '五結菜單 · 21 品項',
    copy: '點單、加料、現金找零到每日報表。原本的菜單已經備好，打開就能點單。',
    action: '開始點餐',
    icon: Store,
  },
];
const questions = [
  [
    '需要安裝嗎？',
    '不用。手機或電腦打開這個網址，就能選擇工具。建議使用最新版瀏覽器；第一次使用需要連線載入網站。',
  ],
  [
    '資料會存在哪裡？',
    '班級、字卡、菜單和訂單保存在目前瀏覽器。請使用各工具內的備份功能定期匯出；清除瀏覽器資料可能移除紀錄。',
  ],
  [
    '換一台裝置，可以接著用嗎？',
    '目前需要先在原裝置匯出備份，再到另一台裝置的相同工具匯入。會員登入不會自動同步工具資料。',
  ],
  [
    '點餐工具有什麼品項？',
    '使用原五結點餐工具的 21 個品項與價格。四種煎類都可加蛋，也能在菜單設定裡調整名稱、價格與供應狀態。',
  ],
  [
    '同一台電腦可以給不同的人用嗎？',
    '使用同一瀏覽器的人會共用工具資料。切換會員不會切換本機資料；共用電腦請使用各自的瀏覽器設定檔。',
  ],
  ['現在需要付費嗎？', '目前三個工具提供免費試用，尚未啟用訂閱或收款。'],
];

function ToolVisual({ kind }: { kind: string }) {
  return (
    <div className={`tool-visual visual-${kind}`} aria-hidden="true">
      {kind === 'classroom' ? (
        <div className="demo-class">
          <div className="demo-top">
            <span>今日的進步</span>
            <span className="demo-live" />
          </div>
          {[
            ['小安', '認真參與', '+1'],
            ['小晴', '完成任務', '+2'],
            ['小宇', '主動挑戰', '+5'],
          ].map(([name, action, score]) => (
            <div className="demo-student" key={name}>
              <span className="demo-avatar">{name.slice(-1)}</span>
              <span>
                {name}
                <small>{action}</small>
              </span>
              <b>{score}</b>
            </div>
          ))}
        </div>
      ) : kind === 'learn' ? (
        <div className="demo-reading">
          <span className="demo-label">READ. KEEP. REMEMBER.</span>
          <p>
            A little <mark>progress</mark>
            <br />
            every day.
          </p>
          <div>
            <span>
              progress <small>進步；進展</small>
            </span>
            <Volume2 size={17} />
          </div>
        </div>
      ) : (
        <div className="demo-order">
          <div className="demo-top">
            <ReceiptText size={17} />
            <span>目前訂單</span>
            <span className="demo-live" />
          </div>
          <div className="demo-order-row">
            <span>
              大腸麵線 <small>大碗</small>
            </span>
            <b>$60</b>
          </div>
          <div className="demo-order-row">
            <span>蚵仔煎</span>
            <b>$75</b>
          </div>
          <div className="demo-total">
            <span>合計</span>
            <strong>$135</strong>
            <span className="demo-confirm">
              <Check size={14} />
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
export default function Home() {
  const openTools = () =>
    document
      .getElementById('daily-tools')
      ?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'instant'
          : 'smooth',
        block: 'start',
      });
  return (
    <div className="suite reference-home">
      <SuiteNav active="home" />
      <main>
        <section className="reference-hero" aria-labelledby="daily-title">
          <img
            className="reference-hero-image"
            src={suiteAsset('design/daily-tools-comic.webp')}
            alt="黑白漫畫風格的工具小怪獸，抱著書本與收銀機，站在街屋旁"
            fetchPriority="high"
          />
          <div className="reference-hero-copy">
            <span className="reference-eyebrow">日常工具所</span>
            <h1 id="daily-title">
              daily<span className="wordmark-dot">.</span>tools
            </h1>
            <p>
              班級管理、英文學習、日常點餐。
              <br />
              三個順手的工具，打開網頁就開始。
              <br />
              工具資料留在你的裝置。
            </p>
            <button className="reference-cta" onClick={openTools}>
              開啟我的工具 <ArrowRight size={18} />
            </button>
          </div>
          <div className="reference-hero-caption">
            <span>把日常，做得更順手。</span>
            <button onClick={openTools} aria-label="向下查看工具">
              <ArrowDown />
            </button>
          </div>
        </section>
        <section
          className="reference-tools"
          id="daily-tools"
          aria-labelledby="tools-title"
        >
          <h2 className="reference-section-label" id="tools-title">
            三 個 工 具
          </h2>
          <div className="reference-tool-grid">
            {tools.map((tool) => (
              <a
                className="reference-tool-card"
                href={toolHref(tool.id)}
                key={tool.id}
              >
                <ToolVisual kind={tool.id} />
                <div className="reference-card-meta">
                  <tool.icon size={16} />
                  <span>{tool.label}</span>
                </div>
                <h3>{tool.name}</h3>
                <p>{tool.copy}</p>
                <span className="reference-card-action">
                  {tool.action}
                  <ArrowUpRight size={17} />
                </span>
              </a>
            ))}
          </div>
          <div className="reference-details-strip">
            <span>
              <Monitor />
              打開瀏覽器就能用
            </span>
            <span>
              <ShieldCheck />
              工具資料保存在本機
            </span>
            <span>
              <Check />
              目前免費試用
            </span>
          </div>
        </section>
        <section className="reference-faq" aria-labelledby="faq-title">
          <h2 className="reference-section-label" id="faq-title">
            常 見 問 題
          </h2>
          <div className="reference-faq-panel">
            {questions.map(([question, answer]) => (
              <details key={question}>
                <summary>
                  {question}
                  <Plus size={18} />
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <footer className="reference-footer">
        <div className="reference-footer-main">
          <a className="reference-footer-brand" href={toolHref('home')}>
            daily.tools<small>日常工具所</small>
          </a>
          <div>
            <h2>工具</h2>
            {tools.map((tool) => (
              <a key={tool.id} href={toolHref(tool.id)}>
                {tool.name}
              </a>
            ))}
          </div>
          <div>
            <h2>關於</h2>
            <a href={suiteAsset('privacy.html')}>隱私與資料</a>
            <a
              href="https://github.com/taiwanape/smallshop-pos-tw"
              target="_blank"
              rel="noreferrer"
            >
              GitHub <ArrowUpRight size={13} />
            </a>
          </div>
        </div>
        <div className="reference-footer-bottom">
          <span>© {new Date().getFullYear()} 日常工具所</span>
          <span>班級 · 學習 · 小店</span>
        </div>
      </footer>
    </div>
  );
}
