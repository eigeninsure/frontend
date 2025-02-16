import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '@/lib/contract';

interface InsuranceData {
  totalDeposit: number;
  totalSecured: number;
  contracts: Array<{
    id: string;
    depositAmount: number;
    securedAmount: number;
    expirationTime: string;
  }>;
}

export function useInsuranceData(address?: string) {
  const [data, setData] = useState<InsuranceData>({
    totalDeposit: 0,
    totalSecured: 0,
    contracts: []
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner()
        const address = await signer.getAddress()
        const contract = new ethers.Contract(
          CONTRACT_ADDRESS,
          CONTRACT_ABI,
          provider
        );

        // Fetch insurances for the given address
        const userInsurances = [];
        let i = 0;
        while (true) {
          try {
            const insurance = await contract.insurances(address, i);
            userInsurances.push(insurance);
            i++;
          } catch (error) {
            break;
          }
        }

        const ETHPrice = 2600

        const filteredInsurances = userInsurances.filter(insurance => insurance[3] && insurance[4]);
        const formattedInsurances = filteredInsurances.map((insurance, index) => ({
          id: index.toString(),
          depositAmount: parseFloat((Number(insurance[0]) * (10 ** -18) * ETHPrice).toFixed(2)),
          securedAmount: parseFloat((Number(insurance[1]) * (10 ** -18) * ETHPrice).toFixed(2)),
          expirationTime: new Date(Number(insurance[2]) * 1000).toISOString()
        }));

        setData({
          totalDeposit: formattedInsurances.reduce((acc, insurance) => acc + insurance.depositAmount, 0),
          totalSecured: formattedInsurances.reduce((acc, insurance) => acc + insurance.securedAmount, 0),
          contracts: formattedInsurances
        });

        console.log({
          totalDeposit: formattedInsurances.reduce((acc, insurance) => acc + insurance.depositAmount, 0),
          totalSecured: formattedInsurances.reduce((acc, insurance) => acc + insurance.securedAmount, 0),
          contracts: formattedInsurances
        })

      } catch (error) {
        console.error('Error fetching insurance data:', error);
      } finally {
        setIsLoading(false);
      }
      setIsLoading(false);
    }

    console.log("hello")
    fetchData();
  }, [address]);

  return { data, isLoading };
} 