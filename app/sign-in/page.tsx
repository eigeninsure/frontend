'use client';

declare global {
  interface Window {
    ethereum: any;
  }
}


import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { ethers } from 'ethers';
import { SiweMessage } from 'siwe';
import axios from 'axios';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import React from 'react';

export interface AccountType {
  address?: string;
  balance?: string;
  chainId?: string;
  network?: string;
}

export default function Page() {
  const router = useRouter();
  const [isConnecting, setIsConnecting] = useState(false);
  const supabase = createClientComponentClient();

  // Check if user is logged in
  React.useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push('/');
      }
    };
    checkUser();
  }, [router, supabase.auth]);

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      
      // 1. Check/switch to Holesky network
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      
      if (network.chainId !== BigInt(17000)) {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x4268' }] // 17000 in hex
        });
      }

      // 2. Get signer after network switch
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      // Get nonce from server
      const { data: { nonce } } = await axios.get(`/api/auth/nonce?address=${address}`);
      
      // Create SIWE message
      const message = new SiweMessage({
        domain: window.location.host,
        address,
        statement: 'Sign in with Ethereum',
        uri: window.location.origin,
        version: '1',
        chainId: 17000,
        nonce
      }).prepareMessage();

      // Sign message
      const signature = await signer.signMessage(message);

      // Verify signature
      const { data } = await axios.post('/api/auth/login', { 
        message, 
        signature 
      });

      if (data.success) {
        router.replace('/');
      }
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === '4902') { // Chain not added
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0x4268',
            chainName: 'Holesky Testnet',
            nativeCurrency: {
              name: 'Holesky ETH',
              symbol: 'ETH',
              decimals: 18
            },
            rpcUrls: ['https://holesky.drpc.org'],
            blockExplorerUrls: ['https://holesky.etherscan.io']
          }]
        });
        // Retry connection after adding network
        return handleConnect();
      }
      console.error('Wallet connection error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      toast.error(errorMessage);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="flex h-dvh w-screen items-center justify-center">
      <button 
        onClick={handleConnect}
        disabled={isConnecting}
        className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600"
      >
        {isConnecting ? 'Connecting...' : 'Connect Wallet'}
      </button>
    </div>
  );
}
