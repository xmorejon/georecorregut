import InteractiveMap from '@/components/dashboard/interactive-map';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard | GeoRecorregut',
};

export default function DashboardPage() {
  return (
    <div className="h-full w-full">
      <InteractiveMap />
    </div>
  );
}
