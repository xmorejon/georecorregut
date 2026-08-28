'use client';
import { PT_Sans } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { useEffect } from 'react'; // Import useEffect

const ptSans = PT_Sans({
  weight: ['400', '700'],
  subsets: ['latin'],
  display: 'swap',
});

export default function RootLayout({
 children,
}: Readonly<{
  children: React.ReactNode;
}>) {

 return <Providers><LayoutContent>{children}</LayoutContent></Providers>;
}

function LayoutContent({ children }: { children: React.ReactNode }) {

  useEffect(() => {
    // Check if service workers are supported
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js') // Register your service worker file
          .then((registration) => {
            console.log('Service Worker registered:', registration);
          })
          .catch((error) => {
            console.error('Service Worker registration failed:', error);
          });
      });
    }
  }, []); // Empty dependency array means this effect runs once after the initial render

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/icons/travel_favicon_16px.ico" sizes="16x16" type="image/x-icon" />
        <link rel="icon" href="/icons/travel_favicon_24px.ico" sizes="24x24" type="image/x-icon" />
        <link rel="icon" href="/icons/travel_favicon_32px.ico" sizes="32x32" type="image/x-icon" />
        <link rel="icon" href="/icons/travel_favicon_64px.ico" sizes="64x64" type="image/x-icon" />
        <link rel="manifest" href="/manifest.webmanifest" />
      </head>
      <body className={ptSans.className}>{children}</body>
    </html>
 );
}
