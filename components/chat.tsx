'use client'

import { useChat, type Message } from 'ai/react'

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
import {uploadJsonToPinata} from '@/lib/ipfs'
import { DocumentPanel } from '@/components/document-panel'

const AVS_API_ENDPOINT = 'http://10.32.86.7:4000/api/tasks'

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

interface ApprovalResponse {
  status: 'pending' | 'completed';
  approvalRate?: number;
  message?: string;
}

async function pollClaimApproval(ipfsHash: string): Promise<ApprovalResponse> {
  const response = await fetch(`http://10.32.86.7:4000/api/claims/${ipfsHash}/approval-rate`);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
}

async function pollUntilComplete(ipfsHash: string, maxAttempts = 10): Promise<ApprovalResponse> {
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    const result = await pollClaimApproval(ipfsHash);
    console.log('Poll attempt', attempts + 1, 'result:', result);
    
    if (result.status === 'completed') {
      return result;
    }
    
    // Wait 2 seconds before next poll
    await new Promise(resolve => setTimeout(resolve, 2000));
    attempts++;
  }
  
  throw new Error('Polling timed out');
}

export function Chat({ id, initialMessages, className }: ChatProps) {
  const [previewToken, setPreviewToken] = useLocalStorage<string | null>(
    'ai-token',
    null
  )
  const [previewTokenDialog, setPreviewTokenDialog] = useState(IS_PREVIEW)
  const [previewTokenInput, setPreviewTokenInput] = useState(previewToken ?? '')
  const [documents, setDocuments] = useState<Array<{
    id: string
    type: 'pdf' | 'image'
    name: string
    preview: string
    ipfsHash: string
  }>>([])

  const handleDocumentUpload = async (file: File, preview: string, type: 'pdf' | 'image') => {
    try {
      const content = await file.arrayBuffer()
      const base64Content = Buffer.from(content).toString('base64')
      
      const jsonData = {
        name: file.name,
        type,
        content: base64Content
      }
      
      const ipfsHash = await uploadJsonToPinata(jsonData)
      
      setDocuments(prev => [...prev, {
        id: Math.random().toString(36).substring(7),
        type,
        name: file.name,
        preview,
        ipfsHash
      }])

      toast.success(`File uploaded to IPFS: ${ipfsHash}`)
    } catch (error) {
      console.error('Failed to upload to IPFS:', error)
      toast.error('Failed to upload file')
    }
  }

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
              const description = aiResponse.toolCall.arguments[0]
              const amount = aiResponse.toolCall.arguments[1]
              try {
                const jsonData = {
                  name: "EigenInsure Insurance Purchase",
                  description,
                  amount
                }
                const ipfsHash = await uploadJsonToPinata(jsonData);
                console.log('Uploaded JSON to IPFS. Hash:', ipfsHash);

                window.alert(`Processing home insurance coverage for $${amount}. IPFS ${ipfsHash}`)

              } catch (error) {
                console.error('Failed to upload JSON:', error);
              }
              
              // TODO: Call buyInsurance smart contract function for coverage amount
              // createInsurance(wallet.address, amount, ipfsHash)
            } else if (aiResponse.toolCall.name === 'claimInsurance') {
              const description = aiResponse.toolCall.arguments[0]
              const amount = aiResponse.toolCall.arguments[1]

              try {
                // Upload to IPFS
                const jsonData = {
                  name: "EigenInsure Insurance Claim",
                  description,
                  amount
                }
                const ipfsHash = await uploadJsonToPinata(jsonData);
                window.alert(`Processing home insurance claim for $${amount}. IPFS: ${ipfsHash}`);

                // Create task
                const taskResponse = await fetch(AVS_API_ENDPOINT, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    taskName: ipfsHash,
                    voteThreshold: 2
                  })
                });

                if (!taskResponse.ok) {
                  throw new Error(`HTTP error! status: ${taskResponse.status}`);
                }

                const taskResult = await taskResponse.json();
                console.log('Task created:', taskResult);
                window.alert(`Claim task created. Waiting for approval...`);

                // Poll for approval
                try {
                  const approvalResult = await pollUntilComplete(ipfsHash);
                  console.log('Final approval result:', approvalResult);
                  
                  if (approvalResult.approvalRate && approvalResult.approvalRate >= 50) {
                    window.alert(`Claim approved with ${approvalResult.approvalRate}% approval rate! Processing reimbursement...`);
                    // TODO: Call reimbursement function
                    // await reimburse(amount, wallet.address, lastInsuranceId);
                  } else {
                    window.alert(`Claim denied. Approval rate: ${approvalResult.approvalRate}%`);
                  }
                } catch (error) {
                  console.error('Error polling claim status:', error);
                  window.alert('Failed to get claim approval status. Please check back later.');
                }

              } catch (error: unknown) {
                console.error('Error processing claim:', error);
                if (error instanceof Error) {
                  window.alert(`Failed to process claim: ${error.message}`);
                } else {
                  window.alert('Failed to process claim: Unknown error occurred');
                }
              }

              // TODO: Poll AVS until approval rate is finalized
              // const taskStatus = await pollTaskStatus(taskId);

              // If above threshold, trigger reimbursement
              // reimburse(amount, wallet.address, lastInsuranceId)
              // we need to track lastInsuranceId somehow

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
      <div className={cn('pb-[200px] pt-4 md:pt-10 pr-80', className)}>
        {messages.length ? (
          <>
            <ChatList messages={messages} isLoading={isLoading} />
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
      <DocumentPanel 
        documents={documents}
        onUpload={handleDocumentUpload}
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
