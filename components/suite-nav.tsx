'use client';
import { useId, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { toolHref } from '@/lib/suite-paths';
import { MemberButton } from '@/components/member-account';
export function SuiteNav({
  active,
}: {
  active: 'home' | 'classroom' | 'learn' | 'pos';
}) {
  const [expanded, setExpanded] = useState(false);
  const navigationId = useId();
  return (
    <header className="suite-nav reference-nav">
      <a
        className="suite-brand"
        href={toolHref('home')}
        aria-label="日常工具所首頁"
      >
        daily<span className="wordmark-dot">.</span>tools
      </a>
      <nav
        id={navigationId}
        className={expanded ? 'is-expanded' : ''}
        aria-label="工具導覽"
      >
        {[
          { id: 'home' as const, label: '首頁' },
          { id: 'classroom' as const, label: '班級小夥伴' },
          { id: 'learn' as const, label: '英文學習' },
          { id: 'pos' as const, label: '小店快收' },
        ].map((item) => (
          <a
            href={toolHref(item.id)}
            key={item.id}
            aria-current={active === item.id ? 'page' : undefined}
            onClick={() => setExpanded(false)}
          >
            {item.label}
          </a>
        ))}
      </nav>
      <MemberButton />
      <button
        className="suite-menu-toggle"
        type="button"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-controls={navigationId}
        aria-label={expanded ? '關閉導覽' : '開啟導覽'}
      >
        {expanded ? <X /> : <Menu />}
      </button>
    </header>
  );
}
