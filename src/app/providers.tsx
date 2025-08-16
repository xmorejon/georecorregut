'use client';

import { APIProvider } from '@vis.gl/react-google-maps';
import { AppProvider } from '@/contexts/app-context';
import { Toaster } from '@/components/ui/toaster';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY_PLACEHOLDER'}>
      <AppProvider>
        {children}
        <Toaster />
      </AppProvider>
    </APIProvider>
  );
}
