'use client';

import { useSession } from 'next-auth/react';
import { useState } from 'react';
import RepositoryList from '@/components/RepositoryList';
import Header from '@/components/Header';

export default function Home() {
  const { data: session } = useSession();
  const [showConsole, setShowConsole] = useState(true);

  return (
    <main className="container py-4">
      <Header
        showConsole={showConsole}
        onToggleConsole={() => setShowConsole(!showConsole)}
      />
      {session && (
        <RepositoryList showConsole={showConsole} />
      )}
    </main>
  );
}
