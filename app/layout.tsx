import { Metadata } from 'next'

import { Toaster } from 'react-hot-toast'
import { cookies } from 'next/headers'

import { GeistSans } from "geist/font/sans";

import '@/app/globals.css'
// import { fontMono, fontSans } from '@/lib/fonts'
import { cn } from '@/lib/utils'
import { TailwindIndicator } from '@/components/tailwind-indicator'
import { Providers } from '@/components/providers'
import { ChatHeader } from '@/components/chat-header'
import { Header } from '@/components/header'

export const metadata: Metadata = {
  title: {
    default: 'Next.js AI Chatbot',
    template: `%s - Next.js AI Chatbot`
  },
  description: 'An AI-powered chatbot template built with Next.js and Vercel.',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' }
  ],
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png'
  }
}

interface RootLayoutProps {
  children: React.ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  const session = cookies().get('session')
  
  return (
    <html lang="en" suppressHydrationWarning className={GeistSans.className}>
      <head />
      <body
        // className={cn(
        //   'font-sans antialiased',
        // )}
      >
        <Toaster />
        <Header  />
        <Providers attribute="class" defaultTheme="light" enableSystem>
          <div className="flex max-h-screen flex-col center-center justify-center overflow-hidden">
            <main className="flex flex-1 flex-col ">{children}</main>
          </div>
          <TailwindIndicator />
        </Providers>
      </body>
    </html>
  )
}
