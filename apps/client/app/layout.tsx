import { CommonDialogHost } from '@repo/ui-composition';
import type { Metadata } from 'next';
import { Noto_Sans_KR } from 'next/font/google';
import { cookies } from 'next/headers';
import type { ReactNode } from 'react';

import '@repo/ui-core/globals.css';

import { ThemeToggle } from '@/features/theme-toggle';

const notoSansKr = Noto_Sans_KR({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-noto-sans-kr'
});

export const metadata: Metadata = {
  title: '미리온돈',
  description: '이미 쓴 카드값과 앞으로 나갈 돈까지 반영해, 이번 달 남은 생활비를 확인하세요.'
};

export default async function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  const theme = (await cookies()).get('theme')?.value === 'dark' ? 'dark' : 'light';
  const htmlClassName = [notoSansKr.variable, theme === 'dark' ? 'dark' : ''].filter(Boolean).join(' ');

  return (
    <html lang="ko" className={htmlClassName} style={{ colorScheme: theme }}>
      <body className="font-sans bg-background text-foreground antialiased">
        <ThemeToggle initialTheme={theme} />
        {children}
        <CommonDialogHost />
      </body>
    </html>
  );
}
