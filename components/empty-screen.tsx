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
  },
  // {
  //   heading: 'Purchase an insurance',
  //   message: 'I want to purchase an insurance.'
  // },
  // {
  //   heading: 'Make a claim',
  //   message: `I want to make a claim.`
  // }
]

export function EmptyScreen({ setInput }: Pick<UseChatHelpers, 'setInput'>) {
  return (
    <div className="flex flex-col items-center h-full">
      <div className="fixed bottom-32 left-0 right-0 mx-auto w-full max-w-2xl px-4">
        <div className="w-full flex flex-row items-start gap-4">
          {exampleMessages.map((message, index) => (
            <Card key={index} className="cursor-pointer w-full" onClick={() => setInput(message.message)}>
              <CardHeader>
                <p className='text-md'>{message.heading}</p>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
