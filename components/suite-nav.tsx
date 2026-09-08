import { Blocks, BookOpen, GraduationCap, Store } from 'lucide-react';

export function SuiteNav({
  active,
}: {
  active: 'home' | 'classroom' | 'learn' | 'pos';
}) {
  return (
    <header className="suite-nav">
      <a className="suite-brand" href="/">
        <Blocks aria-hidden="true" />
        <span>
          日常工具所<small>DAILY TOOLS</small>
        </span>
      </a>
      <nav aria-label="工具導覽">
        {[
          { id: 'home', href: '/', label: '所有工具', icon: Blocks },
          {
            id: 'classroom',
            href: '/classroom',
            label: '班級小夥伴',
            icon: GraduationCap,
          },
          { id: 'learn', href: '/learn', label: '英文學習', icon: BookOpen },
          { id: 'pos', href: '/pos', label: '小店快收', icon: Store },
        ].map(({ id, href, label, icon: Icon }) => (
          <a
            href={href}
            key={id}
            aria-current={active === id ? 'page' : undefined}
          >
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </a>
        ))}
      </nav>
      <span className="suite-local">
        <span />
        個人工作空間
      </span>
    </header>
  );
}
