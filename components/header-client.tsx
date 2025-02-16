'use client'

import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/sidebar'
import { IconSidebar } from '@/components/ui/icons'

export function HeaderClient({ address }: { address?: string }) {
  const router = useRouter()

  const handleLogout = async () => {
    const res = await fetch('/api/auth/logout', { method: 'POST' })
    const data = await res.json()
    if (data.redirect) {
      router.push(data.redirect)
    }
  }

  return (
    <header className=" top-0 z-50 flex h-16 w-full shrink-0 items-center justify-between  px-4">
      <div className="flex items-center gap-4">
        <Sidebar />
        <Button
          variant="ghost"
          onClick={() => router.push('/')}
        >
          New Chat
        </Button>
      </div>

      <div className="flex items-center gap-2">
        {address ? (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            <span className="text-sm font-mono">
              {`${address.slice(0, 6)}...${address.slice(-4)}`}
            </span>
            <Button 
              onClick={handleLogout}
              variant="ghost" 
              size="sm" 
              className="text-muted-foreground hover:text-foreground"
            >
              Disconnect
            </Button>
          </div>
        ) : (
          <Button variant="link" asChild className="-ml-2">
            <Link href="/sign-in">Connect Wallet</Link>
          </Button>
        )}
      </div>
    </header>
  )
} 