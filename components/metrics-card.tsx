'use client';

import { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react';
import { useInsuranceData } from '@/hooks/use-insurance-data';
import { Skeleton } from '@/components/ui/skeleton';

interface MetricsCardProps {
  address?: string;
}

export function MetricsCard({ address }: MetricsCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { data, isLoading } = useInsuranceData(address);

  if (isLoading) {
    return (
      <div className="border rounded-lg bg-background shadow-sm mx-auto mb-4 max-w-3xl w-full md:mx-auto p-4">
        <div className="flex justify-between items-center gap-4">
          <div className="flex-1 flex justify-between">
            <div className="w-1/2 pr-2 border-r">
              <p className="text-sm text-muted-foreground">Total Paid</p>
              <Skeleton className="h-8 w-24" />
            </div>
            <div className="w-1/2 pl-2">
              <p className="text-sm text-muted-foreground">Coverable Amount</p>
              <Skeleton className="h-8 w-24" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg bg-background shadow-sm mx-auto mb-4 max-w-3xl w-full md:mx-auto">
      <div className="p-4">
        <div className="flex justify-between items-center gap-4">
          <div className="flex-1 flex justify-between">
            <div className="w-1/2 pr-2 border-r">
              <p className="text-sm text-muted-foreground">Total Paid</p>
              <p className="text-xl font-semibold">${data.totalPaid.toLocaleString()}</p>
            </div>
            <div className="w-1/2 pl-2">
              <p className="text-sm text-muted-foreground">Coverable Amount</p>
              <p className="text-xl font-semibold">${data.totalCoverable.toLocaleString()}</p>
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
          <div className="mt-4 border-t pt-4">
            {data.contracts.map((contract) => (
              <div 
                key={contract.id}
                className="py-2 px-3 hover:bg-accent rounded-md transition-colors border-b"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{contract.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Expires {contract.expiry}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm">Paid: ${contract.paid.toLocaleString()}</p>
                    <p className="text-sm">Covered: ${contract.covered.toLocaleString()}</p>
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