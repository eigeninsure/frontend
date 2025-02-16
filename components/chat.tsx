'use client'

import { useChat, type Message } from 'ai/react'
import { ethers } from 'ethers'
import { cn } from '@/lib/utils'
import { ChatList } from '@/components/chat-list'
import { ChatPanel } from '@/components/chat-panel'
import { EmptyScreen } from '@/components/empty-screen'
import { ChatScrollAnchor } from '@/components/chat-scroll-anchor'
import { useLocalStorage } from '@/lib/hooks/use-local-storage'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { toast } from 'react-hot-toast'
import { uploadJsonToPinata } from '@/lib/ipfs'
import { CONTRACT_ABI, CONTRACT_ADDRESS } from '@/lib/contract'

const IS_PREVIEW = process.env.VERCEL_ENV === 'preview'
export interface ChatProps extends React.ComponentProps<'div'> {
  initialMessages?: Message[]
  id?: string
}

interface ToolCall {
  name: string
  arguments: any[]
}

interface AIResponse {
  text: string
  toolCall: ToolCall | null
}

export function Chat({ id, initialMessages, className }: ChatProps) {
  const [previewToken, setPreviewToken] = useLocalStorage<string | null>(
    'ai-token',
    null
  )
  const [previewTokenDialog, setPreviewTokenDialog] = useState(IS_PREVIEW)
  const [previewTokenInput, setPreviewTokenInput] = useState(previewToken ?? '')
  const { messages, append, reload, stop, isLoading, input, setInput } =
    useChat({
      initialMessages,
      id,
      body: {
        id,
        previewToken
      },
      onResponse(response) {
        if (response.status === 401) {
          toast.error(response.statusText)
        }
      },
      async onFinish(message) {
        try {
          // Parse the message content as JSON
          const aiResponse: AIResponse = JSON.parse(message.content)

          // Handle tool calls
          if (aiResponse.toolCall) {
            if (aiResponse.toolCall.name === 'buyInsurance') {
              // Refactored: call createInsurance smart contract function
              const description = aiResponse.toolCall.arguments[0]
              const amount = aiResponse.toolCall.arguments[1]

              try {
                const jsonData = {
                  name: "EigenInsure Insurance Purchase",
                  description,
                  amount
                }
                const ipfsHash = await uploadJsonToPinata(jsonData)
                console.log('Uploaded JSON to IPFS. Hash:', ipfsHash)

                // --- Begin smart contract call ---
                if (typeof window.ethereum !== 'undefined') {
                  const provider = new ethers.BrowserProvider(window.ethereum)
                  await provider.send('eth_requestAccounts', [])
                  const signer = await provider.getSigner()
                  const insuranceContract = new ethers.Contract(
                    CONTRACT_ADDRESS,
                    CONTRACT_ABI,
                    signer
                  )

                  const amountToETH = amount / 3000;

                  // Convert the coverage amount from ETH to wei.
                  // Assumes the "amount" is provided as a string or number representing ETH.
                  const securedAmount = ethers.parseEther(amountToETH.toString())

                  const tx = await insuranceContract.createInsurance(
                    securedAmount,
                    ipfsHash
                  )
                  console.log('Transaction submitted:', tx.hash)
                  toast.loading('Creating insurance...')
                  const receipt = await tx.wait()
                  toast.dismiss()
                  toast.success('Insurance created successfully!')
                  console.log('Insurance created:', receipt)

                  // Optionally, extract the insuranceId from the event logs
                  const event = receipt.events?.find(
                    (e: any) => e.event === 'InsuranceCreated'
                  )
                  if (event && event.args) {
                    const insuranceId = event.args.insuranceId
                    window.alert(
                      `Insurance created with ID: ${insuranceId.toString()}`
                    )
                  }
                } else {
                  toast.error(
                    'No Ethereum provider found. Please install MetaMask.'
                  )
                }
                // --- End smart contract call ---
              } catch (error) {
                console.error('Failed to process insurance purchase:', error)
                toast.error('Failed to process insurance purchase')
              }
            } else if (aiResponse.toolCall.name === 'claimInsurance') {
              const description = aiResponse.toolCall.arguments[0]
              const amount = aiResponse.toolCall.arguments[1]

              const jsonData = {
                name: "EigenInsure Insurance Claim",
                description,
                amount
              }
              const ipfsHash = await uploadJsonToPinata(jsonData)
              window.alert(
                `Processing home insurance claim for $${amount} with description: ${description}. IPFS: ${ipfsHash}`
              )

              // TODO: Call AVS create task function with amount and description.

              // TODO: Poll AVS until approval rate is finalized

              // If above threshold, trigger reimbursement

              // Else, alert() user about denial of claim.
            }
          }
        } catch (error) {
          // If the content isn't JSON, just display it normally
          console.log('Not a JSON response:', message.content)
        }
      }
    })
  return (
    <>
      <div className={cn('pb-[200px] pt-4 md:pt-10', className)}>
        {messages.length ? (
          <>
            <ChatList messages={messages} />
            <ChatScrollAnchor trackVisibility={isLoading} />
          </>
        ) : (
          <EmptyScreen setInput={setInput} />
        )}
      </div>
      <ChatPanel
        id={id}
        isLoading={isLoading}
        stop={stop}
        append={append}
        reload={reload}
        messages={messages}
        input={input}
        setInput={setInput}
      />

      <Dialog open={previewTokenDialog} onOpenChange={setPreviewTokenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter your OpenAI Key</DialogTitle>
            <DialogDescription>
              If you have not obtained your OpenAI API key, you can do so by{' '}
              <a
                href="https://platform.openai.com/signup/"
                className="underline"
              >
                signing up
              </a>{' '}
              on the OpenAI website. This is only necessary for preview
              environments so that the open source community can test the app.
              The token will be saved to your browser&apos;s local storage under
              the name <code className="font-mono">ai-token</code>.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={previewTokenInput}
            placeholder="OpenAI API key"
            onChange={e => setPreviewTokenInput(e.target.value)}
          />
          <DialogFooter className="items-center">
            <Button
              onClick={() => {
                setPreviewToken(previewTokenInput)
                setPreviewTokenDialog(false)
              }}
            >
              Save Token
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
