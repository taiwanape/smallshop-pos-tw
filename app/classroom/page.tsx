import ClassroomApp from '@/components/classroom-app';
import { SuiteNav } from '@/components/suite-nav';
export const metadata = { title: '班級小夥伴｜日常工具所' };
export default function Page() {
  return (
    <div className="suite">
      <SuiteNav active="classroom" />
      <ClassroomApp />
    </div>
  );
}
