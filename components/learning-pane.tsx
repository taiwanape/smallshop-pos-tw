import { ArrowUpRight, BookOpen } from 'lucide-react';
import { suiteAsset } from '@/lib/suite-paths';
export function LearningPane() {
  return (
    <section className="learning-pane">
      <div className="learning-pane-title">
        <div>
          <span className="neo-label">WORDS ARE LITTLE ADVENTURES</span>
          <h1>
            <BookOpen />
            英文學習室 <span>LexiHarbor</span>
          </h1>
        </div>
        <a
          href={suiteAsset('lexiharbor/index.html')}
          target="_blank"
          rel="noreferrer"
        >
          獨立開啟
          <ArrowUpRight />
        </a>
      </div>
      <iframe
        className="suite-embed"
        src={suiteAsset('lexiharbor/index.html')}
        title="LexiHarbor 英文閱讀與字卡"
        allow="autoplay; clipboard-write"
      />
    </section>
  );
}
