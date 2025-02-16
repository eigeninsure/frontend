import 'server-only'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

export const auth = async ({
  cookieStore
}: {
  cookieStore: ReturnType<typeof cookies>
}) => {
  // Create a Supabase client configured to use cookies
  const supabase = createServerComponentClient({
    cookies: () => cookieStore
  })
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session
}

export async function getSession() {
  const cookieStore = cookies()
  const session = cookieStore.get('session')
  return session?.value
}

export async function getUserFromSession() {
  const address = await getSession()
  if (!address) return null

  const supabase = createRouteHandlerClient({
    cookies: () => cookies()
  })

  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('address', address.toLowerCase())
    .single()

  return user
}
