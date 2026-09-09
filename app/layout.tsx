import type { Metadata } from 'next';
import { AccountProvider } from '@/components/member-account';
import './globals.css';
import './suite.css';
import './neo.css';

export const metadata: Metadata = {
  title: '日常工具所｜班級、英文學習與小店點餐',
  description: '班級養成、英文閱讀字卡、小店點餐，集中在同一個工作空間。',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant-TW">
      <body>
        <AccountProvider>{children}</AccountProvider>
      </body>
    </html>
  );
}
