'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { signIn } from 'next-auth/react'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, Eye, EyeOff, Phone, Mail, ArrowRight, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import PhoneInput from 'react-phone-number-input'
import { emailSignInSchema, emailSignUpSchema, phoneSchema, otpSchema, type EmailSignInData, type EmailSignUpData, type PhoneData, type OtpData } from '@/lib/validationSchemas'
import 'react-phone-number-input/style.css'

interface SignInModalProps {
  children?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export default function SignInModal({ children, open, onOpenChange }: SignInModalProps) {
  const [isOpen, setIsOpen] = useState(open || false)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [phoneStep, setPhoneStep] = useState<'phone' | 'verify'>('phone')
  const [phoneValue, setPhoneValue] = useState<string>('')
  const [countdown, setCountdown] = useState(0)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Email form
  const emailForm = useForm<EmailSignInData | EmailSignUpData>({
    resolver: zodResolver(isSignUp ? emailSignUpSchema : emailSignInSchema),
    defaultValues: {
      email: '',
      password: '',
      ...(isSignUp && { confirmPassword: '', name: '' }),
    },
  })

  // Phone form
  const phoneForm = useForm<PhoneData>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phone: '' },
  })

  // OTP form
  const otpForm = useForm<OtpData>({
    resolver: zodResolver(otpSchema),
    defaultValues: { code: '' },
  })

  // Countdown timer for OTP
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (countdown > 0) {
      interval = setInterval(() => {
        setCountdown(prev => prev - 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [countdown])

  // Handle modal state
  useEffect(() => {
    if (onOpenChange) {
      onOpenChange(isOpen)
    }
  }, [isOpen, onOpenChange])

  useEffect(() => {
    if (open !== undefined) {
      setIsOpen(open)
    }
  }, [open])

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true)
      setError('')
      await signIn('google', { redirectTo: '/dashboard' })
    } catch (error) {
      setError('Failed to sign in with Google')
    } finally {
      setLoading(false)
    }
  }

  const handleEmailSubmit = async (data: EmailSignInData | EmailSignUpData) => {
    try {
      setLoading(true)
      setError('')
      setSuccess('')

      if (isSignUp) {
        // Register new user
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Registration failed')
        }

        setSuccess('Account created successfully! Signing you in...')
        
        // Auto sign in after registration
        setTimeout(async () => {
          await signIn('credentials', {
            email: data.email,
            password: data.password,
            redirectTo: '/dashboard',
          })
        }, 1000)
      } else {
        // Sign in existing user
        const result = await signIn('credentials', {
          email: data.email,
          password: data.password,
          redirectTo: '/dashboard',
        })

        if (result?.error) {
          throw new Error('Invalid credentials')
        }
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  const handlePhoneSubmit = async (data: PhoneData) => {
    try {
      setLoading(true)
      setError('')

      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: data.phone }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send OTP')
      }

      setPhoneStep('verify')
      setCountdown(300) // 5 minutes
      setSuccess('Verification code sent to your phone')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to send verification code')
    } finally {
      setLoading(false)
    }
  }

  const handleOtpSubmit = async (data: OtpData) => {
    try {
      setLoading(true)
      setError('')

      const response = await fetch('/api/auth/verify-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phoneValue,
          code: data.code,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Verification failed')
      }

      // Create session for phone user
      await signIn('credentials', {
        phone: phoneValue,
        redirectTo: '/dashboard',
      })
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  const resetPhoneFlow = () => {
    setPhoneStep('phone')
    setCountdown(0)
    otpForm.reset()
    setError('')
    setSuccess('')
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      
      <DialogContent className="max-w-md p-0 gap-0 bg-white/95 dark:bg-black/95 backdrop-blur-xl border-0 shadow-2xl rounded-none font-mono">
        <div className="relative">
          {/* Header with logo */}
          <div className="p-8 text-center border-b border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <Image 
                src="/ultramaps-logo.png" 
                alt="UltraMaps" 
                width={32} 
                height={32}
                className="w-8 h-8"
              />
              <h1 className="text-xl font-medium tracking-wide">
                UltraMaps
              </h1>
            </div>
            <h2 className="text-2xl font-medium text-neutral-900 dark:text-white tracking-wide">
              {isSignUp ? 'CREATE ACCOUNT' : 'WELCOME BACK'}
            </h2>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-2 tracking-wider uppercase">
              {isSignUp ? 'JOIN THE NEXT-GENERATION MAPPING PLATFORM' : 'SIGN IN TO CONTINUE YOUR JOURNEY'}
            </p>
          </div>

          {/* Alert messages */}
          {error && (
            <div className="mx-8 mt-6 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}
          
          {success && (
            <div className="mx-8 mt-6 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-sm flex items-center space-x-2">
              <CheckCircle className="h-4 w-4" />
              <span>{success}</span>
            </div>
          )}

          {/* Auth forms */}
          <div className="p-8">
            <Tabs defaultValue="email" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-neutral-100 dark:bg-neutral-900 h-12 rounded-none">
                <TabsTrigger 
                  value="email" 
                  className="data-[state=active]:bg-white dark:data-[state=active]:bg-black rounded-none font-mono text-xs tracking-wider uppercase"
                >
                  <Mail className="h-3 w-3 mr-2" />
                  Email
                </TabsTrigger>
                <TabsTrigger 
                  value="phone" 
                  className="data-[state=active]:bg-white dark:data-[state=active]:bg-black rounded-none font-mono text-xs tracking-wider uppercase"
                >
                  <Phone className="h-3 w-3 mr-2" />
                  Phone
                </TabsTrigger>
              </TabsList>

              {/* Email Tab */}
              <TabsContent value="email" className="mt-6">
                <form onSubmit={emailForm.handleSubmit(handleEmailSubmit)} className="space-y-4">
                  {isSignUp && (
                    <div className="space-y-1">
                      <Label htmlFor="name" className="text-xs font-mono tracking-wider uppercase text-neutral-700 dark:text-neutral-300">
                        Full Name (Optional)
                      </Label>
                      <Input
                        {...emailForm.register('name' as any)}
                        id="name"
                        placeholder="John Doe"
                        className="h-12 rounded-none border-0 border-b-2 border-neutral-300 dark:border-neutral-700 focus:border-black dark:focus:border-white bg-transparent focus:ring-0 font-mono text-sm"
                      />
                    </div>
                  )}
                  
                  <div className="space-y-1">
                    <Label htmlFor="email" className="text-xs font-mono tracking-wider uppercase text-neutral-700 dark:text-neutral-300">
                      Email Address
                    </Label>
                    <Input
                      {...emailForm.register('email')}
                      id="email"
                      type="email"
                      placeholder="you@company.com"
                      className="h-12 rounded-none border-0 border-b border-neutral-300 dark:border-neutral-700 focus:border-black dark:focus:border-white bg-transparent focus:ring-0"
                    />
                    {emailForm.formState.errors.email && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                        {emailForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="password" className="text-xs font-mono tracking-wider uppercase text-neutral-700 dark:text-neutral-300">
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        {...emailForm.register('password')}
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter password"
                        className="h-12 rounded-none border-0 border-b border-neutral-300 dark:border-neutral-700 focus:border-black dark:focus:border-white bg-transparent focus:ring-0 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-0 top-1/2 -translate-y-1/2 p-3 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {emailForm.formState.errors.password && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                        {emailForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>

                  {isSignUp && (
                    <div className="space-y-1">
                      <Label htmlFor="confirmPassword" className="text-xs font-mono tracking-wider uppercase text-neutral-700 dark:text-neutral-300">
                        Confirm Password
                      </Label>
                      <Input
                        {...emailForm.register('confirmPassword' as any)}
                        id="confirmPassword"
                        type="password"
                        placeholder="Confirm password"
                        className="h-12 rounded-none border-0 border-b-2 border-neutral-300 dark:border-neutral-700 focus:border-black dark:focus:border-white bg-transparent focus:ring-0 font-mono text-sm"
                      />
                      {emailForm.formState.errors.confirmPassword && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                          {(emailForm.formState.errors as any).confirmPassword?.message}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsSignUp(!isSignUp)
                        emailForm.reset()
                        setError('')
                        setSuccess('')
                      }}
                      className="text-xs font-mono tracking-wider uppercase text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors"
                    >
                      {isSignUp ? '← Back to Sign In' : 'Create Account →'}
                    </button>
                    
                    {!isSignUp && (
                      <button
                        type="button"
                        className="text-xs font-mono tracking-wider uppercase text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors"
                      >
                        Forgot Password?
                      </button>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 rounded-none font-mono text-xs tracking-widest uppercase font-medium transition-all duration-300 border-0 group mt-6"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <div className="flex items-center justify-center space-x-2">
                        <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
                        <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    )}
                  </Button>
                </form>
              </TabsContent>

              {/* Phone Tab */}
              <TabsContent value="phone" className="mt-6">
                {phoneStep === 'phone' ? (
                  <form onSubmit={phoneForm.handleSubmit(handlePhoneSubmit)} className="space-y-4">
                    <div className="space-y-1">
                      <Label htmlFor="phone" className="text-xs font-mono tracking-wider uppercase text-neutral-700 dark:text-neutral-300">
                        Phone Number
                      </Label>
                      <div className="phone-input-container">
                        <PhoneInput
                          value={phoneValue}
                          onChange={(value) => {
                            setPhoneValue(value || '')
                            phoneForm.setValue('phone', value || '')
                          }}
                          defaultCountry="US"
                          placeholder="Enter phone number"
                          className="h-12 w-full"
                        />
                      </div>
                      {phoneForm.formState.errors.phone && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                          {phoneForm.formState.errors.phone.message}
                        </p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      disabled={loading || !phoneValue}
                      className="w-full h-12 bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 rounded-none font-mono text-xs tracking-widest uppercase font-medium transition-all duration-300 border-0 group mt-6"
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <div className="flex items-center justify-center space-x-2">
                          <span>Send Code</span>
                          <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </div>
                      )}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={otpForm.handleSubmit(handleOtpSubmit)} className="space-y-4">
                    <div className="text-center mb-4">
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        Enter the 6-digit code sent to
                      </p>
                      <p className="font-mono text-sm text-black dark:text-white">
                        {phoneValue}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="code" className="text-xs font-mono tracking-wider uppercase text-neutral-700 dark:text-neutral-300">
                        Verification Code
                      </Label>
                      <Input
                        {...otpForm.register('code')}
                        id="code"
                        type="text"
                        placeholder="000000"
                        maxLength={6}
                        className="h-12 rounded-none border-0 border-b border-neutral-300 dark:border-neutral-700 focus:border-black dark:focus:border-white bg-transparent focus:ring-0 text-center text-xl tracking-[0.3em] font-mono"
                      />
                      {otpForm.formState.errors.code && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                          {otpForm.formState.errors.code.message}
                        </p>
                      )}
                    </div>

                    {countdown > 0 && (
                      <div className="text-center">
                        <p className="text-xs font-mono text-neutral-500 dark:text-neutral-400">
                          Resend available in {formatTime(countdown)}
                        </p>
                      </div>
                    )}

                    <div className="flex space-x-0 mt-6">
                      <Button
                        type="button"
                        onClick={resetPhoneFlow}
                        className="flex-1 h-12 bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-none font-mono text-xs tracking-widest uppercase border-0"
                      >
                        ← Back
                      </Button>
                      <Button
                        type="submit"
                        disabled={loading}
                        className="flex-1 h-12 bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 rounded-none font-mono text-xs tracking-widest uppercase border-0 group"
                      >
                        {loading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <div className="flex items-center justify-center space-x-2">
                            <span>Verify</span>
                            <CheckCircle className="h-4 w-4" />
                          </div>
                        )}
                      </Button>
                    </div>

                    {countdown === 0 && (
                      <Button
                        type="button"
                        onClick={() => phoneForm.handleSubmit(handlePhoneSubmit)()}
                        variant="ghost"
                        className="w-full h-10 text-xs font-mono tracking-wider uppercase text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white"
                      >
                        Resend Code
                      </Button>
                    )}
                  </form>
                )}
              </TabsContent>
            </Tabs>

            {/* Google OAuth */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-200 dark:border-neutral-800"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white dark:bg-black px-4 text-neutral-500 dark:text-neutral-400 font-mono tracking-wider uppercase">
                  Or Continue With
                </span>
              </div>
            </div>

            <Button
              onClick={handleGoogleSignIn}
              disabled={loading}
              variant="outline"
              className="w-full h-12 border-2 border-neutral-300 dark:border-neutral-700 hover:border-black dark:hover:border-white rounded-none font-mono text-xs tracking-widest uppercase font-medium transition-all duration-300 group"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <div className="flex items-center justify-center space-x-3">
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span>CONTINUE WITH GOOGLE</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              )}
            </Button>

            {/* Footer */}
            <div className="text-center mt-6">
              <p className="text-xs text-neutral-400 dark:text-neutral-500 font-mono tracking-wider">
                ENTERPRISE • SECURE • GDPR COMPLIANT
              </p>
            </div>
          </div>
        </div>

        <style jsx global>{`
          .phone-input-container .PhoneInputInput {
            height: 48px;
            border: none;
            border-bottom: 2px solid rgb(212 212 212);
            font-family: var(--font-geist-mono);
            font-size: 14px;
            border-radius: 0;
            background: transparent;
            padding: 0 12px;
            outline: none;
          }
          
          .phone-input-container .PhoneInputInput:focus {
            border-bottom-color: black;
          }
          
          .dark .phone-input-container .PhoneInputInput {
            border-bottom-color: rgb(115 115 115);
            color: white;
          }
          
          .dark .phone-input-container .PhoneInputInput:focus {
            border-bottom-color: white;
          }
          
          .phone-input-container .PhoneInputCountrySelect {
            border: none;
            background: transparent;
            font-family: var(--font-geist-mono);
            font-size: 12px;
            letter-spacing: 0.05em;
          }
        `}</style>
      </DialogContent>
    </Dialog>
  )
}