'use client';

import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { GithubIcon } from 'lucide-react';

export default function LoginButton() {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => signIn('github')}
      className="gap-2"
    >
      <GithubIcon className="h-4 w-4" />
      Sign in with GitHub
    </Button>
  );
}
