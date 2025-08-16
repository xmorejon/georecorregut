'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/contexts/app-context';
import InteractiveMap from '@/components/dashboard/interactive-map';
import type { Metadata } from 'next';

export default function DashboardPage() {
  const { user, authLoading } = useAppContext();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);

  if (authLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <InteractiveMap />
    </div>
  );
}
