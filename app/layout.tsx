import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Restaurant Organizer',
  description: 'Premium Restaurant Organizer App',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
