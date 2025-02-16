import { UseChatHelpers } from 'ai/react'

import { Button } from '@/components/ui/button'
import { ExternalLink } from '@/components/external-link'
import { IconArrowRight } from '@/components/ui/icons'
import { Card, CardHeader, CardTitle } from './ui/card'

const exampleMessages = [
  {
    heading: 'Purchase an insurance',
    message: 'I want to purchase an insurance.'
  },
  {
    heading: 'Make a claim',
    message: `I want to make a claim.`
  }
]

export function EmptyScreen({ setInput }: Pick<UseChatHelpers, 'setInput'>) {
  return (
    <div className="mx-auto max-w-2xl px-4 bottom-0 sticky">
        <div className="w-full  flex flex-row items-start gap-4 justify-between">
          {exampleMessages.map((message, index) => (
            <Card key={index} className="cursor-pointer w-1/2" onClick={() => setInput(message.message)}>
              <CardHeader>
                <p className='text-md'>{message.heading}</p>
              </CardHeader>
            </Card>
          ))}
        </div>
    </div>
  )
}
