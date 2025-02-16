import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { generateNonce } from 'siwe'

export async function GET(req: Request) {
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
  
  const address = new URL(req.url).searchParams.get('address')
  if (!address) {
    return Response.json({ error: 'Address is required' }, { status: 400 })
  }

  // Clean up old nonces for this address
  await supabase
    .from('nonces')
    .delete()
    .eq('address', address.toLowerCase())

  const nonce = generateNonce()
  
  // Insert new nonce
  await supabase
    .from('nonces')
    .insert({
      address: address.toLowerCase(),
      nonce
    })

  return Response.json({ nonce })
}