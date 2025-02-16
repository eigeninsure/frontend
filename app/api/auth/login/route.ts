import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { SiweMessage } from 'siwe'

export async function POST(req: Request) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    let { message, signature } = await req.json()
    
    // Check if message is stringified
    if (typeof message === 'string') {
      try {
        message = JSON.parse(message)
      } catch (e) {
        // message is already in correct format
      }
    }

    const siweMessage = new SiweMessage(message)
    await siweMessage.verify({ signature })

    // Verify nonce
    const { data: nonceData, error: nonceError } = await supabase
      .from('nonces')
      .select('nonce')
      .eq('address', siweMessage.address.toLowerCase())
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (nonceError || !nonceData) {
      console.error('Nonce error:', nonceError)
      return Response.json({ error: 'Invalid or expired nonce' }, { status: 422 })
    }

    // Upsert user
    const { error: userError } = await supabase
      .from('users')
      .upsert({
        address: siweMessage.address.toLowerCase(),
        last_login: new Date().toISOString()
      })
      .select()
      .single()

    if (userError) {
      console.error('User error:', userError)
      return Response.json({ error: userError.message }, { status: 422 })
    }

    // Set session cookie
    cookieStore.set('session', siweMessage.address.toLowerCase(), {
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7 // 1 week
    })

    // Clean up used nonce
    await supabase
      .from('nonces')
      .delete()
      .eq('address', siweMessage.address.toLowerCase())

    return Response.json({ success: true })
  } catch (error) {
    console.error('SIWE error:', error)
    return Response.json({ 
      error: error instanceof Error ? error.message : 'Invalid signature' 
    }, { status: 422 })
  }
}