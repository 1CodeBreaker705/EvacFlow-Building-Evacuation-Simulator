import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'EvacFlow 6.0: Building Evacuation Simulator | MAIT CSE',
  description:
    'A Congestion-Aware Building Evacuation Simulator with discrete-time flow modeling, bottleneck detection, and iterative route optimization. Minor Project Batch 2023-2027.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
