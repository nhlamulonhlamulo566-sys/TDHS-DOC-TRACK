
'use client';

import { ReportsView } from '@/components/reports/reports-view';

export default function ReportsPage() {
  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-3xl font-bold tracking-tight font-headline">Reporting & Analytics</h1>
      <ReportsView />
    </div>
  );
}
