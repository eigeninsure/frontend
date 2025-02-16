import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Sidebar } from '@/components/sidebar'
import { SidebarList } from '@/components/sidebar-list'
import { IconNextChat, IconSeparator } from '@/components/ui/icons'
import { Plus as PlusIcon } from 'lucide-react'
import { SidebarFooter } from '@/components/sidebar-footer'
import { ThemeToggle } from '@/components/theme-toggle'
import { ClearHistory } from '@/components/clear-history'
import { cookies } from 'next/headers'
import { clearChats } from '@/app/actions'

export async function Header() {
  const cookieStore = cookies()
  const session = cookieStore.get('session')
  const address = session?.value

  return (
    <header className="sticky top-0 z-50 flex h-16 w-full shrink-0 items-center justify-between border-b px-4 backdrop-blur-xl">
      <div className="flex items-center gap-2">
        {address ? (
          <>
            <Sidebar>
              <React.Suspense fallback={<div className="flex-1 overflow-auto" />}>
                <SidebarList userId={address} />
              </React.Suspense>
              <SidebarFooter>
                <ThemeToggle />
                <ClearHistory clearChats={clearChats} />
              </SidebarFooter>
            </Sidebar>
            <Button variant="ghost" asChild>
              <Link href="/">
                <PlusIcon className="mr-2" />
                New Case
              </Link>
            </Button>
          </>
        ) : (
          <Link href="/" target="_blank" rel="nofollow">
            <IconNextChat className="mr-2 h-6 w-6 dark:hidden" inverted />
            <IconNextChat className="mr-2 hidden h-6 w-6 dark:block" />
          </Link>
        )}
      </div>

      <div className="flex items-center gap-2">
        {address ? (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            <span className="text-sm font-mono">
              {`${address.slice(0, 6)}...${address.slice(-4)}`}
            </span>
            <form action="/api/auth/logout" method="POST">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                Disconnect
              </Button>
            </form>
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
