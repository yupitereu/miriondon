import { CommonDialogHost } from '@repo/ui-composition';
import type { Metadata } from 'next';
import { Noto_Sans_KR } from 'next/font/google';
import { cookies } from 'next/headers';

import '@repo/ui-core/globals.css';

const notoSansKr = Noto_Sans_KR({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-noto-sans-kr'
});

export const metadata: Metadata = {
  title: '미리온돈 · Design Workbench',
  description: '미리온돈 디자인 시스템 및 화면 시안 프리뷰 워크벤치'
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const theme = (await cookies()).get('theme')?.value === 'dark' ? 'dark' : 'light';
  const htmlClassName = [notoSansKr.variable, theme === 'dark' ? 'dark' : ''].filter(Boolean).join(' ');

  return (
    <html lang="ko" className={htmlClassName} style={{ colorScheme: theme }}>
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        {children}
        <CommonDialogHost />
      </body>
    </html>
  );
}
