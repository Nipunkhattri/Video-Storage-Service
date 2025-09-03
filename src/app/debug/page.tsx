'use client';

import { QueueDebugger } from '@/components/QueueDebugger';
import { Header } from '@/components/Header';

export default function DebugPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <QueueDebugger />
      </div>
    </div>
  );
}
