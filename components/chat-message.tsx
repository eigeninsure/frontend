import { IconOpenAI, IconUser } from '@/components/ui/icons'

import { ChatMessageActions } from '@/components/chat-message-actions'
import { CodeBlock } from '@/components/ui/codeblock'
import { MemoizedReactMarkdown } from '@/components/markdown'
import { Message } from 'ai'
import { cn } from '@/lib/utils'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'

interface FileAttachment {
  type: 'pdf' | 'image'
  content: string
  name: string
}

interface ParsedContent {
  text: string
  attachments?: FileAttachment[]
}

function parseMessageContent(content: string): ParsedContent {
  try {
    const parsed = JSON.parse(content)
    return {
      text: parsed.text,
      attachments: parsed.attachments
    }
  } catch (e) {
    return { text: content }
  }
}

export interface ChatMessageProps {
  message: Message
}

export function ChatMessage({ message, ...props }: ChatMessageProps) {
  const { text, attachments } = parseMessageContent(message.content)
  
  return (
    <div
      className={cn('group relative mb-4 flex items-start md:-ml-12')}
      {...props}
    >
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md border shadow',
          message.role === 'user'
            ? 'bg-background'
            : 'bg-primary text-primary-foreground'
        )}
      >
        {message.role === 'user' ? <IconUser /> :
        <img src="https://cryptologos.cc/logos/eigenlayer-eigen-logo.png" className='w-[24px] h-[24px]' />

        }
      </div>
      <div className="ml-4 flex-1 space-y-2 overflow-hidden px-1">
        <MemoizedReactMarkdown
          className="prose break-words dark:prose-invert prose-p:leading-relaxed prose-pre:p-0"
          remarkPlugins={[remarkGfm, remarkMath]}
          components={{
            p({ children }) {
              return <p className="mb-2 last:mb-0">{children}</p>
            },
            code({ node, inline, className, children, ...props }) {
              if (children.length) {
                if (children[0] == '▍') {
                  return (
                    <span className="mt-1 animate-pulse cursor-default">▍</span>
                  )
                }

                children[0] = (children[0] as string).replace('`▍`', '▍')
              }

              const match = /language-(\w+)/.exec(className || '')

              if (inline) {
                return (
                  <code className={className} {...props}>
                    {children}
                  </code>
                )
              }

              return (
                <CodeBlock
                  key={Math.random()}
                  language={(match && match[1]) || ''}
                  value={String(children).replace(/\n$/, '')}
                  {...props}
                />
              )
            }
          }}
        >
          {text}
        </MemoizedReactMarkdown>
        
        {attachments && attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {attachments.map((file, index) => (
              <div key={index} className="flex items-center gap-1 bg-gray-100 rounded px-2 py-1">
                {/* <IconFile className="h-4 w-4" /> */}
                <span className="text-sm">{file.name}</span>
              </div>
            ))}
          </div>
        )}
        
        <ChatMessageActions message={message} />
      </div>
    </div>
  )
}

export function ChatMessageLoading() {
  return (
    <div className="group relative mb-4 mt-4 flex items-start md:-ml-12">
      <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md border shadow bg-primary text-primary-foreground">
        {/* <IconOpenAI /> */}
        <img src="https://cryptologos.cc/logos/eigenlayer-eigen-logo.png" className='w-[24px] h-[24px]' />
      </div>
      <div className="ml-4 flex-1 space-y-2 overflow-hidden px-1">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-3">
            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    </div>
  )
}
