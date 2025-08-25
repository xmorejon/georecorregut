'use client';

import DashboardHeader from '@/components/dashboard/dashboard-header';
import DashboardSidebar from '@/components/dashboard/sidebar';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppProvider } from '@/contexts/app-context';
import { ThemeProvider } from 'next-themes';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider> {}
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <SidebarProvider>
          <div className="flex h-screen w-full flex-col"> {/* Remove closing comment here */}
            <DashboardHeader />
            <div className="flex flex-1 overflow-hidden">
              <DashboardSidebar />
              <main className="flex-1 overflow-y-auto bg-background">
                {children}
              </main>
            </div>
          </div>
        </SidebarProvider>
      </ThemeProvider>
    </AppProvider>
  );
}