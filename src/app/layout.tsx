import type { Metadata } from 'next';
import { APIProvider } from '@vis.gl/react-google-maps';
import { AppProvider } from '@/contexts/app-context';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';

export const metadata: Metadata = {
  title: 'GeoRecorregut',
  description: 'Your personal travel map',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        {/* IMPORTANT: You must replace NEXT_PUBLIC_GOOGLE_MAPS_API_KEY_PLACEHOLDER with your actual Google Maps API key. */}
        <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY_PLACEHOLDER'}>
          <AppProvider>
            {children}
            <Toaster />
          </AppProvider>
        </APIProvider>
      </body>
    </html>
  );
}
