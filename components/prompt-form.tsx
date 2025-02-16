import * as React from 'react'
import Link from 'next/link'
import Textarea from 'react-textarea-autosize'
import { UseChatHelpers } from 'ai/react'
import { useEnterSubmit } from '@/lib/hooks/use-enter-submit'
import { cn } from '@/lib/utils'
import { Button, buttonVariants } from '@/components/ui/button'

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { IconArrowElbow, IconPlus } from '@/components/ui/icons'
import { ArrowUp } from 'lucide-react'

interface PromptFormProps {
  onSubmit: (value: string, attachments: File[]) => Promise<void>
  input?: string
  setInput: (value: string) => void
  isLoading?: boolean
}

export function PromptForm({
  onSubmit,
  input,
  setInput,
  isLoading
}: PromptFormProps) {
  const { formRef, onKeyDown } = useEnterSubmit()
  const inputRef = React.useRef<HTMLTextAreaElement>(null)

  return (
    <form
      onSubmit={async e => {
        e.preventDefault()
        if (!input?.trim()) {
          return
        }
        setInput('')
        await onSubmit(input, [])
      }}
      ref={formRef}
    >
      <div className="flex flex-row justify-between">
        <Textarea
          ref={inputRef}
          tabIndex={0}
          onKeyDown={onKeyDown}
          rows={1}
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Send a message."
          spellCheck={false}
          className=" align-middle min-h-[30px] w-full  resize-none bg-transparent px-4 py-3 focus-within:outline-none sm:text-sm"
        />
        <div className='flex flex-col justify-center'>
          <Button type="submit" size='icon'  className='align-middle justify-end rounded-full cursor-pointer hover:rounded-xl transition-all duration-300' disabled={isLoading}>
            <div>
            <ArrowUp width={20} height={20} className='mr-1.5' />
            {/* <span className="sr-only">Send message</span> */}
            </div>
          </Button>
          </div>
      </div>
    </form>
  )
}
