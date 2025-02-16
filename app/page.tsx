import { nanoid } from '@/lib/utils'
import { Chat } from '@/components/chat'
import { MetricsCard } from '@/components/metrics-card'

export const runtime = 'edge'

export default function IndexPage() {
  const id = nanoid()

  return (
    <div className=" h-max-screen overflow-hidden">
<div className="px-4 py-2">
          <MetricsCard />
        </div>
      <div className="flex-1 min-h-0">
        <Chat id={id} />
      </div>
    </div>
  )
}
