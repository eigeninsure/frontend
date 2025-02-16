import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ABI } from '@/lib/contract';

interface InsuranceData {
  totalPaid: number;
  totalCoverable: number;
  contracts: Array<{
    id: string;
    name: string;
    paid: number;
    covered: number;
    expiry: string;
  }>;
}

export function useInsuranceData(address?: string) {
  const [data, setData] = useState<InsuranceData>({
    totalPaid: 0,
    totalCoverable: 0,
    contracts: []
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!address) return;

      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const contract = new ethers.Contract(
          process.env.NEXT_PUBLIC_INSURANCE_POOL_ADDRESS!,
          CONTRACT_ABI,
          provider
        );

        // Get all insurance IDs for the address with pagination
        const currentBlock = await provider.getBlockNumber();
        let fromBlock = currentBlock - 1;
        let toBlock = currentBlock;
        const batchSize = 5000; // Stay under node's block range limit
        const allEvents = [];
        
        while (fromBlock >= 0) {
          fromBlock = Math.max(0, toBlock - batchSize);
          const filter = contract.filters.InsuranceCreated(address);
          const events = await contract.queryFilter(filter, fromBlock, toBlock);
          allEvents.push(...events);
          
          if (fromBlock === 0) break;
          toBlock = fromBlock - 1;
        }

        let totalPaid = 0;
        let totalCoverable = 0;
        const contracts = [];

        for (const event of allEvents) {
          const insuranceId = (event as any).args[0];
          const insurance = await contract.insurances(address, insuranceId);
          
          // Convert from Wei to ETH to USD (using hardcoded rate for demo)
          const ETH_TO_USD_RATE = 3333; // 1 ETH = $3333 USD
          const depositInUSD = Number(ethers.formatEther(insurance.depositAmount)) * ETH_TO_USD_RATE;
          const coverageInUSD = depositInUSD * 2; // Assuming 2x coverage

          totalPaid += depositInUSD;
          totalCoverable += coverageInUSD;

          contracts.push({
            id: insuranceId.toString(),
            name: `Insurance #${insuranceId}`,
            paid: depositInUSD,
            covered: coverageInUSD,
            expiry: new Date(Number(insurance.activationTime) * 1000 + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          });
        }

        setData({
          totalPaid,
          totalCoverable,
          contracts
        });
      } catch (error) {
        console.error('Error fetching insurance data:', error);
      } finally {
        setIsLoading(false);
      }
      setIsLoading(false);
    }

    fetchData();
  }, [address]);

  return { data, isLoading };
} 