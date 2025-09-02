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

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/icons/travel_favicon_16px.ico" sizes="16x16" type="image/x-icon" />
        <link rel="icon" href="/icons/travel_favicon_24px.ico" sizes="24x24" type="image/x-icon" />
        <link rel="icon" href="/icons/travel_favicon_32px.ico" sizes="32x32" type="image/x-icon" />
        <link rel="icon" href="/icons/travel_favicon_64px.ico" sizes="64x64" type="image/x-icon" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
 );
}

