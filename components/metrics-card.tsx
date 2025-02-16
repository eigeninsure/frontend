'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { IconChevronUpDown } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'

interface MetricsCardProps {
  totalMetric1: number
  totalMetric2: number
  metric1Label: string
  metric2Label: string
  details?: Array<{
    id: string
    name: string
    date: string
    value1: number
    value2: number
  }>
}

export function MetricsCard({
  totalMetric1,
  totalMetric2,
  metric1Label,
  metric2Label,
  details
}: MetricsCardProps) {
  const [isExpanded, setIsExpanded] = React.useState(false)

  return (
    <Card className="mx-auto mb-4 max-w-3xl w-full">
      <div className="p-4">
        <div className="flex justify-between items-center gap-4">
          <div className="flex-1 flex justify-between">
            <div className="w-1/2 pr-2 border-r">
              <p className="text-sm text-muted-foreground">{metric1Label}</p>
              <p className="text-xl font-semibold">
                ${totalMetric1.toLocaleString()}
              </p>
            </div>
            <div className="w-1/2 pl-2">
              <p className="text-sm text-muted-foreground">{metric2Label}</p>
              <p className="text-xl font-semibold">
                ${totalMetric2.toLocaleString()}
              </p>
            </div>
          </div>
          {details && details.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded(!isExpanded)}
              className="shrink-0"
            >
              <IconChevronUpDown
                className={cn(
                  'h-4 w-4 transition-transform',
                  isExpanded ? 'rotate-180' : ''
                )}
              />
            </Button>
          )}
        </div>

        {isExpanded && details && details.length > 0 && (
          <div className="mt-4 border-t pt-4 space-y-2">
            {details.map((item) => (
              <div
                key={item.id}
                className="py-2 px-3 hover:bg-accent rounded-md transition-colors"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">{item.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm">
                      Metric 1: ${item.value1.toLocaleString()}
                    </p>
                    <p className="text-sm">
                      Metric 2: ${item.value2.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
} 