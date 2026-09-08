import {
  ArrowUpRight,
  BookOpen,
  GraduationCap,
  Store,
  Sprout,
  ShieldCheck,
} from 'lucide-react';
import { SuiteNav } from '@/components/suite-nav';
export default function Home() {
  return (
    <div className="suite">
      <SuiteNav active="home" />
      <main className="suite-home">
        <div className="suite-heading">
          <div>
            <span className="suite-eyebrow">你的日常，順手一點。</span>
            <h1>今天，想用哪個工具？</h1>
            <p>班級經營、英文學習、小店點餐，都在這裡。</p>
          </div>
          <span className="suite-tool-count">
            03 <small>個工具 / 一個入口</small>
          </span>
        </div>
        <section className="suite-tools" aria-label="所有工具">
          <a className="suite-tool suite-class-tool" href="/classroom">
            <div className="suite-tool-top">
              <GraduationCap />
              <span>新工具</span>
            </div>
            <div>
              <span className="suite-eyebrow">CLASS COMPANIONS</span>
              <h2>班級小夥伴</h2>
              <p>
                每一次進步，
                <br />
                都讓小夥伴長大一點。
              </p>
            </div>
            <div className="suite-pet-row" aria-hidden="true">
              <span>🦊</span>
              <span>🐱</span>
              <span>🐼</span>
            </div>
            <div className="suite-flow">
              <span>課堂積分</span>
              <b>→</b>
              <span>兌換食物</span>
              <b>→</b>
              <span>寵物成長</span>
            </div>
            <div className="suite-tool-bottom">
              <span>開啟班級工作台</span>
              <ArrowUpRight />
            </div>
          </a>
          <a className="suite-tool suite-learn-tool" href="/learn">
            <div className="suite-tool-top">
              <BookOpen />
              <span>LexiHarbor</span>
            </div>
            <div>
              <span className="suite-eyebrow">READ. SAVE. REMEMBER.</span>
              <h2>英文學習</h2>
              <p>
                把讀過的文章，
                <br />
                變成記得住的單字。
              </p>
            </div>
            <div className="suite-word">
              <span>curiosity</span>
              <small>/ˌkjʊriˈɑːsəti/</small>
              <b>好奇心</b>
            </div>
            <div className="suite-tool-bottom">
              <span>閱讀・原句字卡・自然發音</span>
              <ArrowUpRight />
            </div>
          </a>
          <a className="suite-tool suite-pos-tool" href="/pos">
            <div className="suite-tool-top">
              <Store />
              <span>Smallshop POS</span>
            </div>
            <div>
              <span className="suite-eyebrow">A LITTLE SHOP, IN ORDER.</span>
              <h2>小店快收</h2>
              <p>
                點餐、加料、找零。
                <br />
                一張工作台處理好。
              </p>
            </div>
            <div className="suite-receipt">
              <span>
                招牌乾麵 <b>$55</b>
              </span>
              <span>
                加蛋 <b>$15</b>
              </span>
              <hr />
              <strong>
                合計 <b>NT$ 70</b>
              </strong>
              <small>操作範例</small>
            </div>
            <div className="suite-tool-bottom">
              <span>點單・收現・訂單報表</span>
              <ArrowUpRight />
            </div>
          </a>
        </section>
        <div className="suite-footnotes">
          <div>
            <ShieldCheck />
            <p>
              <strong>資料存在目前的瀏覽器</strong>
              <span>
                班級、字卡、訂單各自保存；換裝置或清除瀏覽資料前，請先到各工具匯出備份。
              </span>
            </p>
          </div>
          <div>
            <Sprout />
            <p>
              <strong>三套工具，直接開始使用</strong>
              <span>
                目前是個人試用工作空間，尚未提供雲端同步、會員訂閱或正式商用收款。
              </span>
            </p>
          </div>
        </div>
      </main>
      <footer className="suite-footer">
        日常工具所 <span>讓工具回到日常。</span>
      </footer>
    </div>
  );
}
