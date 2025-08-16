import DashboardHeader from '@/components/dashboard/dashboard-header';
import DashboardSidebar from '@/components/dashboard/sidebar';
import { SidebarProvider } from '@/components/ui/sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
        <div className="flex h-screen w-full flex-col">
          <DashboardHeader />
          <div className="flex flex-1 overflow-hidden">
            <DashboardSidebar />
            <main className="flex-1 overflow-y-auto bg-background">
              {children}
            </main>
          </div>
        </div>
    </SidebarProvider>
  );
}
