import { type Message } from 'ai'

import { Separator } from '@/components/ui/separator'
import { ChatMessage, ChatMessageLoading } from '@/components/chat-message'

export interface ChatList {
  messages: Message[]
  isLoading?: boolean
}

export function ChatList({ messages, isLoading }: ChatList) {
  // Show loading state even when there are no messages
  if (isLoading && !messages.length) {
    return (
      <div className="relative mx-auto max-w-2xl px-4">
        <ChatMessageLoading />
      </div>
    )
  }

  if (!messages.length) {
    return null
  }

  return (
    <div className="relative mx-auto max-w-2xl px-4">
      {messages.map((message, index) => (
        <div key={index}>
          <ChatMessage message={message} />
          {(index < messages.length - 1 || isLoading) && (
            <Separator className="my-4 md:my-8" />
          )}
        </div>
      ))}
      {isLoading && <ChatMessageLoading />}
    </div>
  )
}
