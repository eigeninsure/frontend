import { type Message } from 'ai'

import { Separator } from '@/components/ui/separator'
import { ChatMessage, ChatMessageLoading } from '@/components/chat-message'

export interface ChatList {
  messages: Message[]
  isLoading?: boolean
}

export function ChatList({ messages, isLoading }: ChatList) {
  console.log('ChatList render:', { messages: messages.length, isLoading })
  
  if (!messages.length && isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4">
        <ChatMessageLoading />
      </div>
    )
  }

  if (!messages.length) {
    return null
  }

  return (
    <div className="mx-auto w-full mx-4 px-4 overflow-y-auto">
      {messages.map((message, index) => (
        <div key={index}>
          <ChatMessage message={message} />
          {index < messages.length - 1 && (
            <Separator className="my-4 md:my-8" />
          )}
        </div>
      ))}
      {isLoading && (
        <>
          <Separator className="my-4 md:my-8" />
          <ChatMessageLoading />
        </>
      )}
    </div>
  )
}
