import { HeaderClient } from '@/components/header-client'
import { cookies } from 'next/headers'

export function Header() {
  const cookieStore = cookies()
  const session = cookieStore.get('session')
  const address = session?.value

  return <HeaderClient address={address} />
}
