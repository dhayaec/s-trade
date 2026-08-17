import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { QueryProvider } from '@/components/providers/query-provider';
import { Navbar } from '@/components/navbar';
import './globals.css';

export const metadata: Metadata = {
  title: 'S-Trade — Swing Trading Analysis Platform',
  description: 'Technical-analysis copilot for short-term swing traders (BTST).',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <QueryProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
        </QueryProvider>
      </body>
    </html>
  );
}
