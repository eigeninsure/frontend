'use client';

import { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react';
import { useInsuranceData } from '@/app/hooks/use-insurance-data';
import { Skeleton } from '@/components/ui/skeleton';

interface MetricsCardProps {
  address?: string;
}

export function MetricsCard({ address }: MetricsCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { data, isLoading } = useInsuranceData();

  if (isLoading) {
    return (
      <div className="border rounded-lg bg-background shadow-sm w-full p-4">
        <div className="flex justify-between items-center gap-4">
          <div className="flex-1 flex justify-between">
            <div className="w-1/2 pr-2 border-r">
              <p className="text-sm text-muted-foreground">Total Deposit</p>
              <Skeleton className="h-8 w-24" />
            </div>
            <div className="w-1/2 pl-2">
              <p className="text-sm text-muted-foreground">Total Coverable</p>
              <Skeleton className="h-8 w-24" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg bg-background shadow-sm w-full">
      <div className="p-4">
        <div className="flex justify-between items-center gap-4">
          <div className="flex-1 flex justify-between">
            <div className="w-1/2 pr-2 border-r">
              <p className="text-sm text-muted-foreground">Total Paid</p>
              <p className="text-xl font-semibold">${data.totalDeposit.toLocaleString()}</p>
            </div>
            <div className="w-1/2 pl-2">
              <p className="text-sm text-muted-foreground">Coverable Amount</p>
              <p className="text-xl font-semibold">${data.totalSecured.toLocaleString()}</p>
            </div>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 hover:bg-accent rounded-lg shrink-0"
          >
            {isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
          </button>
        </div>

        {isExpanded && data.contracts.length > 0 && (
          <div className="mt-4 border-t pt-4 max-h-[200px] overflow-y-auto">
            {data.contracts.map((contract) => (
              <div
                key={contract.id}
                className="py-2 px-3 hover:bg-accent rounded-md transition-colors border-b"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Expires {contract.expirationTime}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm">Deposit: ${contract.depositAmount}</p>
                    <p className="text-sm">Secured: ${contract.securedAmount}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 