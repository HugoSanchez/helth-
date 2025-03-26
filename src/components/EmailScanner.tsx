'use client';

import { useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/lib/client/supabase';

type ScanStatus = {
  found: number;
  currentPage: number;
  totalScanned: number;
  isComplete: boolean;
  timeElapsed?: number;
  error?: string;
};

export function EmailScanner() {
  const [status, setStatus] = useState<ScanStatus>({
    found: 0,
    currentPage: 1,
    totalScanned: 0,
    isComplete: false
  });

  useEffect(() => {
    startScan();
  }, []);

  const startScan = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No session found');
      }

      const response = await fetch('/api/gmail/scan', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to start scan');
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const events = decoder.decode(value).split('\n\n');
        for (const event of events) {
          if (!event.trim()) continue;
          const data = JSON.parse(event.replace('data: ', ''));

          if (data.type === 'progress') {
            setStatus({
              found: data.found,
              currentPage: data.currentPage,
              totalScanned: data.totalScanned,
              isComplete: false
            });
          } else if (data.type === 'complete') {
            setStatus(prev => ({
              ...prev,
              isComplete: true,
              timeElapsed: data.timeElapsed
            }));
          } else if (data.type === 'error') {
            setStatus(prev => ({
              ...prev,
              error: data.message,
              isComplete: true
            }));
          }
        }
      }
    } catch (error) {
      console.error('Scan failed:', error);
      setStatus(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        isComplete: true
      }));
    }
  };

  if (status.error) {
    return (
      <div className="w-full max-w-md mx-auto p-4">
        <div className="text-center space-y-2">
          <h3 className="font-semibold text-red-600">Scan Failed ✗</h3>
          <p className="text-sm text-red-500">{status.error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto p-4 space-y-4">
      <div className="text-center space-y-2">
        <h3 className="font-semibold">
          {status.isComplete ? 'Scan Complete! ✓' : 'Scanning Inbox for Medical Documents'}
        </h3>
        <Progress value={(status.found / 20) * 100} />
        <p className="text-sm text-gray-600">
          Found: {status.found}/20 emails with attachments
        </p>
        {!status.isComplete && (
          <p className="text-sm text-gray-500">
            Currently scanning page {status.currentPage}
            <br />
            Total emails scanned: {status.totalScanned}
          </p>
        )}
        {status.isComplete && status.timeElapsed && (
          <p className="text-sm text-gray-500">
            Time elapsed: {Math.round(status.timeElapsed / 1000)}s
            <br />
            Total emails scanned: {status.totalScanned}
          </p>
        )}
      </div>
    </div>
  );
}
