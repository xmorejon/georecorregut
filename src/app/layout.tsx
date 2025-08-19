'use client';
import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { useAppContext } from '@/contexts/app-context';

export default function RootLayout({
 children,
}: Readonly<{
  children: React.ReactNode;
}>) {
 return <Providers><LayoutContent>{children}</LayoutContent></Providers>;
}

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { mode } = useAppContext();
  console.log('LayoutContent mode:', mode);
  return (
    <html lang="en" suppressHydrationWarning className={mode === 'dark' ? 'dark' : ''}>
      <head>
 <link rel="preconnect" href="https://fonts.googleapis.com" />
 <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
 <link href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&display=swap" rel="stylesheet" />
 </head>
      <body>{children}</body>
    </html>
 );
}

