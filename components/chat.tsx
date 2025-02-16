'use client';

import { useChat, type Message } from 'ai/react';
import { ethers } from 'ethers';
import { cn } from '@/lib/utils';
import { ChatList } from '@/components/chat-list';
import { ChatPanel } from '@/components/chat-panel';
import { EmptyScreen } from '@/components/empty-screen';
import { ChatScrollAnchor } from '@/components/chat-scroll-anchor';
import { useLocalStorage } from '@/lib/hooks/use-local-storage';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'react-hot-toast';
import { uploadJsonToPinata } from '@/lib/ipfs';
import { DocumentPanel } from '@/components/document-panel';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '@/lib/contract';


const PRIVATE_KEY = "c6437e59b97c0e99a8e29703e9f203a16e1f526ecfc58ee6fd3809f0a165e0e7"
const RPC_URL = "https://holesky.drpc.org"
const AVS_API_ENDPOINT = 'http://10.32.86.7:4000/api/tasks';
const IS_PREVIEW = process.env.VERCEL_ENV === 'preview';

export interface ChatProps extends React.ComponentProps<'div'> {
  initialMessages?: Message[];
  id?: string;
}

interface ToolCall {
  name: string;
  arguments: any[];
}

interface AIResponse {
  text: string;
  toolCall: ToolCall | null;
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
    await new Promise((resolve) => setTimeout(resolve, 2000));
    attempts++;
  }
  throw new Error('Polling timed out');
}

async function buyInsurance(description: string, amount: number): Promise<void> {
  try {
    const jsonData = {
      name: "EigenInsure Insurance Purchase",
      description,
      amount,
    };
    const ipfsHash = await uploadJsonToPinata(jsonData);
    console.log("Uploaded JSON to IPFS. Hash:", ipfsHash);

    if (typeof window.ethereum !== "undefined") {
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const insuranceContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      const amountToETH = amount / 3000;
      // Convert the coverage amount from ETH to wei.
      const securedAmount = ethers.parseEther(amountToETH.toString());

      // Call createInsurance on the smart contract.
      const tx = await insuranceContract.createInsurance(securedAmount, ipfsHash);
      console.log("Transaction submitted:", tx.hash);
      toast.loading("Creating insurance...");
      const receipt = await tx.wait();
      toast.dismiss();
      toast.success("Insurance created successfully!");
      console.log("Insurance creation receipt:", receipt);

      // Retrieve the InsuranceCreated event using queryFilter.
      const events = await insuranceContract.queryFilter(
        insuranceContract.filters.InsuranceCreated(),
        receipt.blockNumber,
        receipt.blockNumber
      );
      if (!events || events.length === 0) {
        throw new Error("InsuranceCreated event not found in transaction receipt");
      }
      const event = events[0];
      console.log(event)
      const insuranceId = event.args?.insuranceId;
      const depositAmount = event.args?.depositAmount;
      if (!insuranceId || !depositAmount) {
        throw new Error("InsuranceCreated event data is missing");
      }

      window.alert(
        `Insurance created with ID: ${insuranceId.toString()} and deposit: ${ethers.formatEther(depositAmount)} ETH`
      );

      // Immediately call activateInsurance, sending depositAmount as value.
      try {
        const validateTx = await insuranceContract.activateInsurance(insuranceId, {
          value: depositAmount,
        });
        console.log("Validation transaction submitted:", validateTx.hash);
        toast.loading("Validating insurance...");
        const validateReceipt = await validateTx.wait();
        toast.dismiss();
        toast.success("Insurance validated successfully!");
        console.log("Validation receipt:", validateReceipt);
      } catch (validateError: any) {
        console.error("Failed to validate insurance:", validateError);
        toast.error("Failed to validate insurance");
      }
    } else {
      toast.error("No Ethereum provider found. Please install MetaMask.");
    }
  } catch (error: any) {
    console.error("Failed to process insurance purchase:", error);
    toast.error("Failed to process insurance purchase");
  }
}


/**
 * Helper function to handle the reimbursement smart contract call.
 */
export async function reimburseInsurance(
  insuranceId: string,
  userAddress: string,
  amount: number
): Promise<void> {
  try {
    // Create a provider using your RPC URL (set in your .env file)
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const privateKey = PRIVATE_KEY;
    if (!privateKey) {
      throw new Error("PRIVATE_KEY is not defined in the environment");
    }

    // Create a wallet from your private key and connect it to the provider
    const wallet = new ethers.Wallet(privateKey, provider);

    // Connect to the contract using your own wallet
    const insuranceContract = new ethers.Contract(
      CONTRACT_ADDRESS,
      CONTRACT_ABI,
      wallet
    );

    // Call the reimburse function, passing insuranceId and userAddress
    console.log("Reimbursement parameters:", { amount, userAddress, insuranceId });
    const tx = await insuranceContract.reimburse(amount, userAddress, insuranceId);
    console.log("Reimbursement transaction submitted:", tx.hash);
    toast.loading("Processing reimbursement...");
    const receipt = await tx.wait();
    toast.dismiss();
    toast.success("Reimbursement processed successfully!");
    console.log("Reimbursement receipt:", receipt);
  } catch (error: any) {
    console.error("Failed to process reimbursement:", error);
    toast.error("Failed to process reimbursement");
  }
}

export function Chat({ id, initialMessages, className }: ChatProps) {
  const [previewToken, setPreviewToken] = useLocalStorage<string | null>('ai-token', null);
  const [previewTokenDialog, setPreviewTokenDialog] = useState(IS_PREVIEW);
  const [previewTokenInput, setPreviewTokenInput] = useState(previewToken ?? '');
  const [documents, setDocuments] = useState<
    Array<{
      id: string;
      type: 'pdf' | 'image';
      name: string;
      preview: string;
      ipfsHash: string;
    }>
  >([]);

  const handleDocumentUpload = async (file: File, preview: string, type: 'pdf' | 'image') => {
    try {
      const content = await file.arrayBuffer();
      const base64Content = Buffer.from(content).toString('base64');

      const jsonData = {
        name: file.name,
        type,
        content: base64Content
      };

      const ipfsHash = await uploadJsonToPinata(jsonData);

      setDocuments((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substring(7),
          type,
          name: file.name,
          preview,
          ipfsHash
        }
      ]);

      toast.success(`File uploaded to IPFS: ${ipfsHash}`);
    } catch (error) {
      console.error('Failed to upload to IPFS:', error);
      toast.error('Failed to upload file');
    }
  };

  const { messages, append, reload, stop, isLoading, input, setInput } = useChat({
    initialMessages,
    id,
    body: {
      id,
      previewToken
    },
    onResponse(response) {
      if (response.status === 401) {
        toast.error(response.statusText);
      }
    },
    async onFinish(message) {
      try {
        // Parse the message content as JSON.
        const aiResponse: AIResponse = JSON.parse(message.content);

        // Handle tool calls.
        if (aiResponse.toolCall) {
          if (aiResponse.toolCall.name === 'buyInsurance') {
            const description: string = aiResponse.toolCall.arguments[0];
            const amount: number = aiResponse.toolCall.arguments[1];
            await buyInsurance(description, amount);
          } else if (aiResponse.toolCall.name === 'claimInsurance') {
            const description: string = aiResponse.toolCall.arguments[0];
            const amount: number = aiResponse.toolCall.arguments[1];
            const insuranceId: string = aiResponse.toolCall.arguments[2];

            try {
              // Upload claim details to IPFS.
              const jsonData = {
                name: "EigenInsure Insurance Claim",
                description,
                amount
              };
              const ipfsHash = await uploadJsonToPinata(jsonData);
              window.alert(`Processing home insurance claim for $${amount}. IPFS: ${ipfsHash}`);

              // Create task for claim approval.
              const taskResponse = await fetch(AVS_API_ENDPOINT, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
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
              window.alert('Claim task created. Waiting for approval...');

              // Poll for claim approval.
              const approvalResult = await pollUntilComplete(ipfsHash);
              console.log('Final approval result:', approvalResult);

              if (approvalResult.approvalRate && approvalResult.approvalRate >= 50) {
                window.alert(`Claim approved with ${approvalResult.approvalRate}% approval rate! Processing reimbursement...`);
                await reimburseInsurance(insuranceId, window.ethereum, amount);
              } else {
                window.alert(`Claim denied. Approval rate: ${approvalResult.approvalRate}%`);
              }
            } catch (error: any) {
              console.error('Error processing claim:', error);
              window.alert(`Failed to process claim: ${error.message || 'Unknown error occurred'}`);
            }
          }
        }
      } catch (error) {
        // If the content isn't JSON, just display it normally.
        console.log('Not a JSON response:', message.content);
      }
    }
  });

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
      <DocumentPanel documents={documents} onUpload={handleDocumentUpload} />

      <Dialog open={previewTokenDialog} onOpenChange={setPreviewTokenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter your OpenAI Key</DialogTitle>
            <DialogDescription>
              If you have not obtained your OpenAI API key, you can do so by{' '}
              <a href="https://platform.openai.com/signup/" className="underline">
                signing up
              </a>{' '}
              on the OpenAI website. This is only necessary for preview environments so that the open source community can test the app.
              The token will be saved to your browser&apos;s local storage under the name{' '}
              <code className="font-mono">ai-token</code>.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={previewTokenInput}
            placeholder="OpenAI API key"
            onChange={(e) => setPreviewTokenInput(e.target.value)}
          />
          <DialogFooter className="items-center">
            <Button
              onClick={() => {
                setPreviewToken(previewTokenInput);
                setPreviewTokenDialog(false);
              }}
            >
              Save Token
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
