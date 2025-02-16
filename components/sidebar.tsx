'use client'

import { Button } from '@/components/ui/button'
import { IconSidebar } from '@/components/ui/icons'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import React from 'react'
import type { Database } from '@/lib/db_types'
import type { Chat } from '@/lib/types'

export function Sidebar() {
  const router = useRouter()
  const [chats, setChats] = React.useState<Chat[]>([])
  const supabase = createClientComponentClient<Database>()

  React.useEffect(() => {
    const loadChats = async () => {
      const session = document.cookie.includes('session=')
      if (!session) return

      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data) {
        const formattedChats = data.map(chat => ({
          id: chat.id,
          title: (chat.payload as any)?.title || `Chat ${chat.id}`,
          createdAt: new Date(chat.created_at),
          userId: chat.user_id,
          path: `/chat/${chat.id}`,
          messages: (chat.payload as any)?.messages || [],
          sharePath: (chat.payload as any)?.sharePath
        }))
        setChats(formattedChats)
      }
    }

    loadChats()

    const channel = supabase
      .channel('chats')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'chats' }, 
        loadChats
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [supabase, router])

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" className="-ml-2 h-9 w-9 p-0">
          <IconSidebar className="h-6 w-6" />
          <span className="sr-only">Toggle Sidebar</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="inset-y-0 flex h-auto w-[300px] flex-col p-0">
        <SheetHeader className="p-4">
          <SheetTitle className="text-sm">Chat History</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-auto">
          {chats.map(chat => (
            <Button
              key={chat.id}
              variant="ghost"
              className="w-full justify-start px-4 py-2 text-left"
              onClick={() => router.push(chat.path)}
            >
              {chat.title}
            </Button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}
