'use client';

import { signOut, useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import LoginButton from './LoginButton';

interface HeaderProps {
  showConsole: boolean;
  onToggleConsole: () => void;
}

export default function Header({ showConsole, onToggleConsole }: HeaderProps) {
  const { data: session } = useSession();

  return (
    <div className="flex items-center justify-between py-4 mb-8">
      <div className="flex items-center gap-8">
        <h1 className="text-2xl font-bold">Clean GitHub Artifacts</h1>
      </div>
      <div className="flex items-center gap-2">
        {session ? (
          <>
            <Button variant="ghost" size="sm" onClick={() => signOut()}>
              SIGN OUT
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleConsole}
              className={showConsole ? 'text-primary' : ''}
            >
              CONSOLE
            </Button>
          </>
        ) : (
          <LoginButton />
        )}
      </div>
    </div>
  );
}