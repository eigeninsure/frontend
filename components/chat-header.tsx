'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cookies } from 'next/headers';

interface ChatHeaderProps {
  address?: string;
}

export function ChatHeader({ address }: ChatHeaderProps) {
  const router = useRouter();

  const handleDisconnect = async () => {
    // Delete the session cookie
    document.cookie = 'session=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
    router.push('/sign-in');
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between border-b bg-background px-4 py-3">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          onClick={() => {
            router.push('/');
            router.refresh();
          }}
        >
          New Case
        </Button>
      </div>

      {address && (
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-500"></span>
            <code className="text-sm text-muted-foreground">
              {address.slice(0, 6)}...{address.slice(-4)}
            </code>
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDisconnect}
            className="text-muted-foreground hover:text-foreground"
          >
            Disconnect
          </Button>
        </div>
      )}
    </header>
  );
} 