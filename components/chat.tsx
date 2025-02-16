'use client';

import { useChat, type Message } from 'ai/react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/db_types'
import { ethers } from 'ethers';
import { cn } from '@/lib/utils'
import { ChatList } from '@/components/chat-list'
import { ChatPanel } from '@/components/chat-panel'
import { EmptyScreen } from '@/components/empty-screen'
import { ChatScrollAnchor } from '@/components/chat-scroll-anchor'
import { useLocalStorage } from '@/lib/hooks/use-local-storage'
import { getSession } from '@/auth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'react-hot-toast';
import { uploadJsonToPinata } from '@/lib/ipfs';
import { DocumentPanel } from '@/components/document-panel';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '@/lib/contract';
import { MetricsCard } from './metrics-card';


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

interface ChatDocument {
  id: string
  chat_id: string
  user_id: string
  name: string
  type: 'pdf' | 'image'
  preview: string
  ipfs_hash: string
  created_at: string
}

interface UserSession {
  id: string
  email?: string
  address?: string
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
      const insuranceId = (event as ethers.EventLog).args?.insuranceId;
      const depositAmount = (event as ethers.EventLog).args?.depositAmount;
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
  const [previewToken, setPreviewToken] = useLocalStorage<string | null>(
    'ai-token',
    null
  )
  const [previewTokenDialog, setPreviewTokenDialog] = useState(IS_PREVIEW)
  const [previewTokenInput, setPreviewTokenInput] = useState(previewToken ?? '')
  const supabase = createClientComponentClient<Database>()
  const [documents, setDocuments] = useState<ChatDocument[]>([])
  const [user, setUser] = useState<UserSession | null>(null)

  // Check authentication status when component mounts
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) {
        console.error('Error fetching session:', error)
        return
      }

      if (session?.user) {
        // Get user data including wallet address
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()

        setUser({
          ...session.user,
          address: userData?.address
        })
      }
    }

    checkUser()

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  // Load documents when chat loads and user is authenticated
  useEffect(() => {
    if (id && user?.address) {
      const loadDocuments = async () => {
        const { data, error } = await supabase
          .from('documents')
          .select('*')
          .eq('chat_id', id)
          .eq('user_id', user.address!.toLowerCase())
          .order('created_at', { ascending: true })

        if (error) {
          console.error('Error loading documents:', error)
          toast.error('Failed to load documents')
          return
        }

        setDocuments(data || [])
      }

      loadDocuments()
    }
  }, [id, user, supabase])

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

      // Only store in database if user is authenticated
      if (user?.id) {
        const { data, error } = await supabase
          .from('documents')
          .insert({
            chat_id: id || 'default',
            user_id: user.id,
            name: file.name,
            type,
            preview,
            ipfs_hash: ipfsHash
          })
          .select()
          .single()

        if (error) throw error
        setDocuments(prev => [...prev, data])
      } else {
        // Add to local documents state without database persistence
        setDocuments(prev => [...prev, {
          id: Math.random().toString(36).substring(7),
          chat_id: id || 'default',
          user_id: 'anonymous',
          name: file.name,
          type,
          preview,
          ipfs_hash: ipfsHash,
          created_at: new Date().toISOString()
        }])
      }

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
        previewToken,
        documents: documents.map(doc => ({
          type: doc.type,
          name: doc.name,
          ipfsHash: doc.ipfs_hash
        }))
      },
      onError: (error) => {
        toast.error(error.message)
      }
    })

  return (
    <div className='flex flex-row h-full w-full mx-auto'>
    <div className={cn('flex flex-col h-full w-full mt-4', className)}>
    <h2 className="text-lg font-semibold mb-4">Assistant</h2>

    {/* <div className='h-1/2 absolute overflow-y-scroll mt-8'> */}

    {messages.length == 0 ? (
      <EmptyScreen setInput={setInput} />
    ) : (
      
      <ChatList messages={messages} isLoading={isLoading} />
      )}
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
    </div>

    {/* </div> */}
    <div className='flex flex-row w-full justify-evenly'>
      <DocumentPanel 
        documents={documents}
        onUpload={handleDocumentUpload}
      />
    </div>
    </div>
  )
}