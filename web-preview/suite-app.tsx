import { lazy, Suspense, useEffect, useState } from 'react';
import { WorkspaceActive } from '@/components/workspace-active';
import SuiteHome from '@/components/suite-home';
import { SuiteNav } from '@/components/suite-nav';
import { LearningPane } from '@/components/learning-pane';
import { parseToolRoute } from '@/lib/suite-paths';
import type { ToolRoute } from '@/lib/suite-paths';
const Classroom = lazy(() => import('@/components/classroom-app'));
const Pos = lazy(() => import('@/components/pos-app'));
const names = {
  home: '日常工具所',
  classroom: '班級小夥伴',
  learn: '英文學習室',
  pos: '小店快收',
};
export default function SuiteApp() {
  const [route, setRoute] = useState<ToolRoute>(() =>
    parseToolRoute(window.location.hash),
  );
  const [visited, setVisited] = useState<ToolRoute[]>(() => [
    parseToolRoute(window.location.hash),
  ]);
  useEffect(() => {
    const sync = () => {
      const next = parseToolRoute(window.location.hash);
      setVisited((old) => (old.includes(next) ? old : [...old, next]));
      setRoute(next);
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);
  useEffect(() => {
    document.title = `${names[route]}｜DAILY TOOLS`;
  }, [route]);
  // Keep visited workspaces mounted: a tool switch must preserve an unfinished
  // POS cart, an article draft and the teacher's current selection.
  return (
    <>
      {visited.map((page) => (
        <div hidden={page !== route} key={page} className="suite-page-panel">
          <WorkspaceActive value={page === route}>
            {page === 'home' ? (
              <SuiteHome />
            ) : (
              <div className={`suite suite-route-${page}`}>
                <SuiteNav active={page} />
                <Suspense
                  fallback={
                    <div className="suite-loading" role="status">
                      正在開啟{names[page]}…
                    </div>
                  }
                >
                  {page === 'classroom' ? (
                    <Classroom />
                  ) : page === 'learn' ? (
                    <LearningPane />
                  ) : (
                    <Pos />
                  )}
                </Suspense>
              </div>
            )}
          </WorkspaceActive>
        </div>
      ))}
    </>
  );
}
