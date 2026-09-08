import PosApp from '@/components/pos-app';
import { SuiteNav } from '@/components/suite-nav';
export const metadata = { title: '小店快收｜日常工具所' };
export default function Page() {
  return (
    <>
      <SuiteNav active="pos" />
      <PosApp />
    </>
  );
}
