'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, ArrowLeft } from 'lucide-react'
import Image from 'next/image'

const errorMessages = {
  Configuration: 'There was a problem with the authentication configuration.',
  AccessDenied: 'Access denied. You do not have permission to sign in.',
  Verification: 'The verification token has expired or has already been used.',
  Default: 'An unexpected authentication error occurred.',
}

export default function AuthErrorPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error') as keyof typeof errorMessages

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-neutral-900 to-neutral-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white/95 dark:bg-black/95 backdrop-blur-xl border-0 shadow-2xl rounded-none">
        <CardHeader className="text-center p-8 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <Image 
              src="/ultramaps-logo.png" 
              alt="UltraMaps" 
              width={32} 
              height={32}
              className="w-8 h-8"
            />
            <h1 className="text-xl font-light tracking-tight" style={{ fontFamily: 'var(--font-geist-mono)' }}>
              UltraMaps
            </h1>
          </div>
          
          <div className="flex items-center justify-center space-x-2 mb-4">
            <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
            <CardTitle className="text-xl font-light text-neutral-900 dark:text-white">
              Authentication Error
            </CardTitle>
          </div>
        </CardHeader>

        <CardContent className="p-8 text-center space-y-6">
          <p className="text-neutral-600 dark:text-neutral-400">
            {errorMessages[error] || errorMessages.Default}
          </p>

          <div className="space-y-3">
            <Button asChild className="w-full h-12 bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 rounded-none font-mono text-xs tracking-widest uppercase">
              <Link href="/auth/signin">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Try Again
              </Link>
            </Button>
            
            <Button asChild variant="ghost" className="w-full h-10 text-xs font-mono tracking-wider uppercase text-neutral-600 dark:text-neutral-400">
              <Link href="/">
                Return Home
              </Link>
            </Button>
          </div>

          <div className="text-center">
            <p className="text-xs text-neutral-400 dark:text-neutral-500 font-mono tracking-wider">
              NEED HELP? CONTACT SUPPORT
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}