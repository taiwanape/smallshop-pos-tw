import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  GraduationCap,
  Store,
  Sparkles,
  ShieldCheck,
  Share2,
} from 'lucide-react';
import { SuiteNav } from '@/components/suite-nav';
import { PetArt } from '@/components/pet-art';
import {
  toolHref,
  suiteAsset,
  SUITE_VERSION,
  SUITE_PUBLIC_URL,
} from '@/lib/suite-paths';

export default function Home() {
  return (
    <div className="suite neo-shell">
      <SuiteNav active="home" />
      <main className="neo-home">
        <header className="neo-home-heading">
          <div>
            <div className="neo-kicker">
              <span /> A LITTLE PLAY IN EVERY DAY.
            </div>
            <h1>
              讓日常，<span>多一點好玩。</span>
              <Sparkles aria-hidden="true" />
            </h1>
            <p>三個順手的工具。上課、學英文、顧小店，現在就開始。</p>
          </div>
          <div className="neo-edition">
            <span>DAILY</span>
            <strong>03</strong>
            <span>TOOLS FOR YOU</span>
          </div>
        </header>
        <section className="neo-tool-grid" aria-label="選擇工具">
          <a
            href={toolHref('classroom')}
            className="neo-tool-card neo-class-card"
          >
            <div className="neo-card-index">
              <span>01 / TEACH & GROW</span>
              <span className="neo-card-icon">
                <GraduationCap />
              </span>
            </div>
            <div className="neo-card-copy">
              <span className="neo-pill neo-new">新夥伴報到！</span>
              <h2>
                班級
                <br />
                小夥伴<span>↗</span>
              </h2>
              <p>
                把每一次努力，
                <br />
                變成小夥伴的成長。
              </p>
            </div>
            <div className="neo-class-art" aria-hidden="true">
              <PetArt pet={0} />
              <PetArt pet={3} />
              <span className="neo-star-note">
                一起
                <br />
                <strong>LEVEL UP!</strong>
              </span>
            </div>
            <div className="neo-card-bottom">
              <div className="neo-feature-tags">
                <span>積分</span>
                <span>餵養</span>
                <span>成長</span>
              </div>
              <span className="neo-open">
                開啟班級
                <ArrowUpRight />
              </span>
            </div>
          </a>
          <a href={toolHref('learn')} className="neo-tool-card neo-learn-card">
            <div className="neo-card-index">
              <span>02 / READ & REMEMBER</span>
              <span className="neo-card-icon">
                <BookOpen />
              </span>
            </div>
            <div className="neo-card-copy">
              <span className="neo-pill">LexiHarbor</span>
              <h2>
                英文
                <br />
                學習室<span>↗</span>
              </h2>
              <p>
                讀懂一句，
                <br />
                記住一個新世界。
              </p>
            </div>
            <img
              className="neo-book-art"
              src={suiteAsset('design/reading-mascot.png')}
              alt="戴眼鏡、拿著星星書籤的書本小夥伴"
            />
            <div className="neo-card-bottom">
              <div className="neo-feature-tags">
                <span>閱讀</span>
                <span>字卡</span>
                <span>發音</span>
              </div>
              <span className="neo-open">
                開始閱讀
                <ArrowUpRight />
              </span>
            </div>
          </a>
          <a href={toolHref('pos')} className="neo-tool-card neo-pos-card">
            <div className="neo-card-index">
              <span>03 / SERVE WITH A SMILE</span>
              <span className="neo-card-icon">
                <Store />
              </span>
            </div>
            <div className="neo-card-copy">
              <span className="neo-pill">五結菜單・21 品項</span>
              <h2>
                小店
                <br />
                快收<span>↗</span>
              </h2>
              <p>
                點單少一點手忙腳亂，
                <br />
                小店多一點從容。
              </p>
            </div>
            <img
              className="neo-noodle-art"
              src={suiteAsset('design/noodle-mascot.png')}
              alt="拿筷子揮手的麵線小夥伴"
            />
            <div className="neo-card-bottom">
              <div className="neo-feature-tags">
                <span>點餐</span>
                <span>找零</span>
                <span>日報</span>
              </div>
              <span className="neo-open">
                開始點餐
                <ArrowUpRight />
              </span>
            </div>
          </a>
        </section>
        <div className="neo-note-row">
          <div>
            <ShieldCheck />
            <p>
              <strong>你的資料，留在你的瀏覽器。</strong>
              <span>班級、字卡、訂單各自保存，記得定期匯出備份。</span>
            </p>
          </div>
          <div>
            <Share2 />
            <p>
              <strong>把好用的工具，分享出去。</strong>
              <span>不用安裝、不用登入，打開網址就能試用。</span>
            </p>
          </div>
        </div>
        <details className="neo-migration" id="move-data">
          <summary>
            新的分享網址與資料搬移 <ArrowRight aria-hidden="true" />
          </summary>
          <div className="neo-migration-content">
            <p>
              日常工具所的新家已準備好。
              <a
                href={SUITE_PUBLIC_URL ?? '/'}
                target="_blank"
                rel="noreferrer"
              >
                開啟新網站 <ArrowUpRight aria-hidden="true" />
              </a>
              分享這個網址，朋友就能直接使用三個工具。
            </p>
            <p>
              曾在舊網址使用過？請先用原本的瀏覽器匯出，再到新網址匯入。換網址不會自動帶入紀錄；搬移完成前請保留備份與舊資料。
            </p>
            <ol>
              <li>
                <strong>班級小夥伴：</strong>
                舊站「管理與備份」→「下載全部班級備份」；新站「已有備份？匯入班級」或「管理與備份」→「匯入備份為新班級」。
              </li>
              <li>
                <strong>英文學習室：</strong>
                舊站「設定」分別匯出「閱讀與字卡」及「詞庫收藏」兩份備份；新站在相同位置貼上各自備份內容。閱讀會合併，詞庫收藏會取代新站現有收藏。
              </li>
              <li>
                <strong>小店快收：</strong>舊站「完整備份」下載
                JSON；新站「匯入備份」。請在新站尚未修改菜單、開始記單前搬移，才能一併還原原菜單；CSV
                不適合還原完整帳本。
              </li>
            </ol>
            <p>
              完成後請核對班級人數、文章與字卡、菜單與訂單，再繼續使用。尚未儲存的文章草稿與購物車不包含在備份內。
            </p>
            <a
              href="https://taiwanape.github.io/smallshop-pos-tw/"
              target="_blank"
              rel="noreferrer"
            >
              開啟原 GitHub 網址，匯出舊資料 <ArrowUpRight aria-hidden="true" />
            </a>
            <p>
              <a
                href="https://smallshop-pos-tw.taiwanape1.chatgpt.site/"
                target="_blank"
                rel="noreferrer"
              >
                開啟原 Sites 網址，匯出舊資料{' '}
                <ArrowUpRight aria-hidden="true" />
              </a>
              。請選擇當初保存紀錄的網址；兩邊的資料各自獨立。
            </p>
          </div>
        </details>
        <footer className="neo-footer">
          <a
            href="https://github.com/taiwanape/smallshop-pos-tw"
            target="_blank"
            rel="noreferrer"
          >
            DAILY TOOLS <ArrowUpRight />
          </a>
          <span>公開試用・資料不會跨裝置同步</span>
          <small>{SUITE_VERSION}</small>
        </footer>
      </main>
    </div>
  );
}
