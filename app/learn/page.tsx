import { SuiteNav } from '@/components/suite-nav';
import { LearningPane } from '@/components/learning-pane';
export const metadata = { title: 'LexiHarbor 英文學習｜日常工具所' };
export default function Page() {
  return (
    <>
      <SuiteNav active="learn" />
      <LearningPane />
    </>
  );
}
