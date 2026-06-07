import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FWC HRMS — AI-Powered Human Resource Management',
  description: 'FWC Inc. next-generation HRMS with AI resume screening, voice interviews, and workforce analytics',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}