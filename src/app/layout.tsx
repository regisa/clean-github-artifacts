import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { getServerSession } from 'next-auth';
import SessionProvider from '@/components/SessionProvider';
import { authOptions } from './api/auth/[...nextauth]/options';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'GitHub Artifacts Cleaner',
  description: 'Manage and clean up GitHub Actions artifacts',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en">
      <body className={inter.className}>
        <SessionProvider session={session}>{children}</SessionProvider>
      </body>
    </html>
  );
}
