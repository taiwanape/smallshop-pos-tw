import {
  ArrowUpRight,
  Blocks,
  BookOpen,
  GraduationCap,
  Store,
} from 'lucide-react';
import { toolHref, SUITE_VERSION } from '@/lib/suite-paths';

export function SuiteNav({
  active,
}: {
  active: 'home' | 'classroom' | 'learn' | 'pos';
}) {
  return (
    <header className="suite-nav">
      <a className="suite-brand" href={toolHref('home')}>
        <Blocks aria-hidden="true" />
        <span>
          日常工具所<small>GOOD TOOLS. GOOD DAYS.</small>
        </span>
      </a>
      <nav aria-label="工具導覽">
        {[
          {
            id: 'home',
            href: toolHref('home'),
            label: '所有工具',
            mobileLabel: '首頁',
            icon: Blocks,
          },
          {
            id: 'classroom',
            href: toolHref('classroom'),
            label: '班級小夥伴',
            mobileLabel: '班級',
            icon: GraduationCap,
          },
          {
            id: 'learn',
            href: toolHref('learn'),
            label: '英文學習',
            mobileLabel: '學英文',
            icon: BookOpen,
          },
          {
            id: 'pos',
            href: toolHref('pos'),
            label: '小店快收',
            mobileLabel: '點餐',
            icon: Store,
          },
        ].map(({ id, href, label, mobileLabel, icon: Icon }) => (
          <a
            href={href}
            key={id}
            aria-current={active === id ? 'page' : undefined}
          >
            <Icon aria-hidden="true" />
            <span className="suite-nav-label">{label}</span>
            <span className="suite-nav-short">
              {mobileLabel}
            </span>
          </a>
        ))}
      </nav>
      <span className="suite-local" title={SUITE_VERSION}>
        OPEN & PLAY <ArrowUpRight />
      </span>
    </header>
  );
}
