import { SuiteNav } from '@/components/suite-nav';
export const metadata = { title: 'LexiHarbor 英文學習｜日常工具所' };
export default function Page() {
  return (
    <>
      <SuiteNav active="learn" />
      <div className="suite-embed-note">
        舊站的字卡可在 LexiHarbor「設定」匯出，再到這裡匯入。
        <a href="/lexiharbor/index.html" target="_blank" rel="noreferrer">
          獨立開啟 ↗
        </a>
      </div>
      <iframe
        className="suite-embed"
        src="/lexiharbor/index.html"
        title="LexiHarbor 英文閱讀與字卡"
        allow="autoplay; clipboard-write"
      />
    </>
  );
}
