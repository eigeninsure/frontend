import { cookies } from 'next/headers'

export async function POST() {
  const cookieStore = cookies()
  
  // Delete the session cookie
  cookieStore.delete('session')
  
  return Response.json({ 
    success: true,
    redirect: '/sign-in'  // Add redirect URL to response
  })
} 