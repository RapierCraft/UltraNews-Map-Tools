'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithPopup, GoogleAuthProvider, signInWithPhoneNumber, RecaptchaVerifier, PhoneAuthProvider, signInWithCredential, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Loader2, Phone, Mail, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import Select from 'react-select';
import { getNames, getCode } from 'country-list';
import { getPhoneCodeForCountry } from '@/lib/countryCodes';

const countries = getNames().map(name => {
  const code = getCode(name);
  const phoneCode = getPhoneCodeForCountry(code);
  return {
    value: code,
    label: `${name} (${phoneCode})`,
    code: code,
    phoneCode: phoneCode
  };
});

const countrySelectStyles = {
  control: (base: any, state: any) => ({
    ...base,
    backgroundColor: 'rgb(15 23 42 / 0.95)',
    borderColor: state.isFocused ? '#3b82f6' : '#475569',
    minHeight: '48px',
    boxShadow: 'none',
    '&:hover': {
      borderColor: '#3b82f6'
    }
  }),
  menu: (base: any) => ({
    ...base,
    backgroundColor: 'rgb(15 23 42)',
    border: '1px solid #475569'
  }),
  option: (base: any, state: any) => ({
    ...base,
    backgroundColor: state.isFocused ? '#1e293b' : 'transparent',
    color: '#e2e8f0',
    '&:hover': {
      backgroundColor: '#1e293b'
    }
  }),
  singleValue: (base: any) => ({
    ...base,
    color: '#e2e8f0'
  }),
  input: (base: any) => ({
    ...base,
    color: '#e2e8f0'
  }),
  placeholder: (base: any) => ({
    ...base,
    color: '#64748b'
  })
};

export default function LoginPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // Email/Password states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  
  // Phone states
  const [selectedCountry, setSelectedCountry] = useState({ value: 'US', label: 'United States (+1)', code: 'US', phoneCode: '+1' });
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [step, setStep] = useState<'phone' | 'verify'>('phone');
  
  const [error, setError] = useState('');

  if (user) {
    router.push('/dashboard');
    return null;
  }

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (!auth) {
        setError('Firebase authentication not configured. Please set up your Firebase credentials.');
        return;
      }
      
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      router.push('/dashboard');
    } catch (error: any) {
      setError(error.message || 'Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (!auth) {
        setError('Firebase authentication not configured. Please set up your Firebase credentials.');
        return;
      }
      
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      router.push('/dashboard');
    } catch (error: any) {
      setError(error.message || `Failed to ${isSignUp ? 'create account' : 'sign in'}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSignIn = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (!auth) {
        setError('Firebase authentication not configured. Please set up your Firebase credentials.');
        return;
      }
      
      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
          callback: () => {
            console.log('reCAPTCHA solved');
          }
        });
      }

      // Format phone number with country code
      const fullPhoneNumber = `${selectedCountry.phoneCode}${phoneNumber}`;

      const confirmationResult = await signInWithPhoneNumber(auth, fullPhoneNumber, window.recaptchaVerifier);
      setVerificationId(confirmationResult.verificationId);
      setStep('verify');
    } catch (error: any) {
      setError(error.message || 'Failed to send verification code');
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (!auth) {
        setError('Firebase authentication not configured. Please set up your Firebase credentials.');
        return;
      }
      
      const credential = PhoneAuthProvider.credential(verificationId, verificationCode);
      await signInWithCredential(auth, credential);
      router.push('/dashboard');
    } catch (error: any) {
      setError(error.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-neutral-900 to-slate-800 p-4">
      <Card className="w-full max-w-md shadow-2xl border-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm">
        <CardHeader className="space-y-4 pb-6">
          <div className="flex items-center justify-center mb-2">
            <div className="flex items-center space-x-3">
              <Image 
                src="/ultramaps-logo.png" 
                alt="UltraMaps Logo" 
                width={40} 
                height={40}
                className="w-10 h-10"
              />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent" style={{ fontFamily: 'var(--font-geist-mono)' }}>
                UltraMaps
              </h1>
            </div>
          </div>
          <CardTitle className="text-2xl text-center text-slate-900 dark:text-slate-100">
            Welcome Back
          </CardTitle>
          <CardDescription className="text-center text-slate-600 dark:text-slate-400">
            Sign in to access your personalized mapping experience
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <div className="p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg">
              {error}
            </div>
          )}

          <Tabs defaultValue="email" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="email" className="flex items-center space-x-2">
                <Mail className="h-4 w-4" />
                <span>Email</span>
              </TabsTrigger>
              <TabsTrigger value="phone" className="flex items-center space-x-2">
                <Phone className="h-4 w-4" />
                <span>Phone</span>
              </TabsTrigger>
              <TabsTrigger value="google" className="flex items-center space-x-2">
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
                <span>Google</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="email" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-700 dark:text-slate-300">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-400"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-slate-700 dark:text-slate-300">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-400 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <button
                    type="button"
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {isSignUp ? 'Already have an account?' : 'Need an account?'}
                  </button>
                  {!isSignUp && (
                    <button
                      type="button"
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>

                <Button
                  onClick={handleEmailAuth}
                  disabled={loading || !email || !password}
                  className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Mail className="h-5 w-5 mr-2" />
                      {isSignUp ? 'Create Account' : 'Sign In'}
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="phone" className="space-y-4">
              {step === 'phone' ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="country" className="text-slate-700 dark:text-slate-300">
                      Country
                    </Label>
                    <Select
                      value={selectedCountry}
                      onChange={(option) => setSelectedCountry(option as any)}
                      options={countries}
                      isSearchable
                      placeholder="Search countries..."
                      styles={countrySelectStyles}
                      className="react-select-container"
                      classNamePrefix="react-select"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-slate-700 dark:text-slate-300">
                      Phone Number
                    </Label>
                    <div className="flex space-x-2">
                      <div className="flex-shrink-0 w-20 h-12 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md flex items-center justify-center text-sm font-mono">
                        {selectedCountry.phoneCode}
                      </div>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="555 123 4567"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="flex-1 h-12 border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-400"
                      />
                    </div>
                  </div>
                  <Button
                    onClick={handlePhoneSignIn}
                    disabled={loading || !phoneNumber}
                    className="w-full h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <Phone className="h-5 w-5 mr-2" />
                        Send Verification Code
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="code" className="text-slate-700 dark:text-slate-300">
                      Verification Code
                    </Label>
                    <Input
                      id="code"
                      type="text"
                      placeholder="123456"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      className="h-12 border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-400 text-center text-lg tracking-widest"
                      maxLength={6}
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => {
                        setStep('phone');
                        setVerificationCode('');
                        setError('');
                      }}
                      variant="outline"
                      className="flex-1 h-12"
                    >
                      Back
                    </Button>
                    <Button
                      onClick={handleVerifyCode}
                      disabled={loading || !verificationCode}
                      className="flex-1 h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white border-0"
                    >
                      {loading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        'Verify & Sign In'
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="google" className="space-y-4">
              <Button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full h-12 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
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
                    Continue with Google
                  </>
                )}
              </Button>
            </TabsContent>
          </Tabs>

          <div className="relative">
            <Separator className="my-6" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="bg-white dark:bg-slate-900 px-4 text-sm text-slate-600 dark:text-slate-400">
                Secure Authentication
              </span>
            </div>
          </div>

          <div className="text-center text-sm text-slate-600 dark:text-slate-400">
            <p>
              By continuing, you agree to our{' '}
              <a href="#" className="text-blue-600 dark:text-blue-400 hover:underline">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#" className="text-blue-600 dark:text-blue-400 hover:underline">
                Privacy Policy
              </a>
            </p>
          </div>
        </CardContent>
      </Card>

      <div id="recaptcha-container"></div>
    </div>
  );
}