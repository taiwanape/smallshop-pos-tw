import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '小店快收 POS',
  description: '為台灣小型餐飲店設計的快速點單與日報工具。',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant-TW">
      <body>{children}</body>
    </html>
  );
}
