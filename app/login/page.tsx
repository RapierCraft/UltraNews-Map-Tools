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
import { Loader2, Phone, Mail, Eye, EyeOff, ArrowRight, Check } from 'lucide-react';
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
    backgroundColor: 'black',
    borderColor: state.isFocused ? '#404040' : '#262626',
    minHeight: '56px',
    boxShadow: 'none',
    borderRadius: '0px',
    '&:hover': {
      borderColor: '#404040'
    }
  }),
  menu: (base: any) => ({
    ...base,
    backgroundColor: 'black',
    border: '1px solid #262626',
    borderRadius: '0px'
  }),
  option: (base: any, state: any) => ({
    ...base,
    backgroundColor: state.isFocused ? '#171717' : 'transparent',
    color: '#ffffff',
    '&:hover': {
      backgroundColor: '#171717'
    }
  }),
  singleValue: (base: any) => ({
    ...base,
    color: '#ffffff'
  }),
  input: (base: any) => ({
    ...base,
    color: '#ffffff'
  }),
  placeholder: (base: any) => ({
    ...base,
    color: '#737373'
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
    <div className="min-h-screen bg-black flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 to-black"></div>
        <div className="relative z-10 flex flex-col justify-center items-center p-12 text-center">
          <div className="mb-8">
            <Image 
              src="/ultramaps-logo.png" 
              alt="UltraMaps" 
              width={120} 
              height={120}
              className="w-30 h-30 opacity-90"
            />
          </div>
          <h1 className="text-6xl font-extralight tracking-tight text-white mb-4" style={{ fontFamily: 'var(--font-geist-mono)' }}>
            UltraMaps
          </h1>
          <p className="text-neutral-400 text-lg font-light leading-relaxed max-w-md">
            Next-generation mapping platform for professionals who demand precision and performance.
          </p>
          <div className="mt-12 grid grid-cols-3 gap-8 text-neutral-500">
            <div className="text-center">
              <div className="w-2 h-2 bg-white rounded-full mx-auto mb-2"></div>
              <p className="text-xs font-mono">SECURE</p>
            </div>
            <div className="text-center">
              <div className="w-2 h-2 bg-white rounded-full mx-auto mb-2"></div>
              <p className="text-xs font-mono">FAST</p>
            </div>
            <div className="text-center">
              <div className="w-2 h-2 bg-white rounded-full mx-auto mb-2"></div>
              <p className="text-xs font-mono">PRECISE</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center mb-8">
            <Image 
              src="/ultramaps-logo.png" 
              alt="UltraMaps" 
              width={48} 
              height={48}
              className="w-12 h-12 mr-4"
            />
            <h1 className="text-3xl font-extralight tracking-tight text-black" style={{ fontFamily: 'var(--font-geist-mono)' }}>
              UltraMaps
            </h1>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-light text-black tracking-tight">Welcome back</h2>
            <p className="text-neutral-600 font-light">Choose your preferred authentication method</p>
          </div>

          {error && (
            <div className="p-4 bg-neutral-100 border-l-4 border-black text-black text-sm font-mono">
              {error}
            </div>
          )}

          <Tabs defaultValue="email" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-neutral-100 p-1 rounded-none h-12">
              <TabsTrigger 
                value="email" 
                className="data-[state=active]:bg-black data-[state=active]:text-white rounded-none font-mono text-xs tracking-wider"
              >
                EMAIL
              </TabsTrigger>
              <TabsTrigger 
                value="phone" 
                className="data-[state=active]:bg-black data-[state=active]:text-white rounded-none font-mono text-xs tracking-wider"
              >
                PHONE
              </TabsTrigger>
              <TabsTrigger 
                value="google" 
                className="data-[state=active]:bg-black data-[state=active]:text-white rounded-none font-mono text-xs tracking-wider"
              >
                GOOGLE
              </TabsTrigger>
            </TabsList>

            <TabsContent value="email" className="space-y-6 mt-8">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-black font-mono text-xs tracking-wider uppercase">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-14 border-0 border-b-2 border-neutral-200 focus:border-black rounded-none bg-transparent text-black placeholder:text-neutral-400 font-light text-lg focus:ring-0"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-black font-mono text-xs tracking-wider uppercase">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-14 border-0 border-b-2 border-neutral-200 focus:border-black rounded-none bg-transparent text-black placeholder:text-neutral-400 font-light text-lg pr-12 focus:ring-0"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-0 top-1/2 -translate-y-1/2 p-3 text-neutral-400 hover:text-black transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="text-black font-mono text-xs tracking-wider uppercase hover:underline"
                  >
                    {isSignUp ? '← SIGN IN' : 'CREATE ACCOUNT →'}
                  </button>
                  {!isSignUp && (
                    <button
                      type="button"
                      className="text-neutral-400 font-mono text-xs tracking-wider uppercase hover:text-black transition-colors"
                    >
                      FORGOT?
                    </button>
                  )}
                </div>

                <Button
                  onClick={handleEmailAuth}
                  disabled={loading || !email || !password}
                  className="w-full h-14 bg-black text-white hover:bg-neutral-800 rounded-none font-mono text-xs tracking-widest uppercase transition-all duration-300 border-0 group"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <div className="flex items-center justify-center space-x-2">
                      <span>{isSignUp ? 'CREATE ACCOUNT' : 'AUTHENTICATE'}</span>
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="phone" className="space-y-6 mt-8">
              {step === 'phone' ? (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="country" className="text-black font-mono text-xs tracking-wider uppercase">
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
                    <Label htmlFor="phone" className="text-black font-mono text-xs tracking-wider uppercase">
                      Phone Number
                    </Label>
                    <div className="flex">
                      <div className="flex-shrink-0 w-24 h-14 bg-black text-white flex items-center justify-center font-mono text-sm tracking-wider">
                        {selectedCountry.phoneCode}
                      </div>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="555 123 4567"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="flex-1 h-14 border-0 border-b-2 border-neutral-200 focus:border-black rounded-none bg-transparent text-black placeholder:text-neutral-400 font-light text-lg focus:ring-0"
                      />
                    </div>
                  </div>
                  
                  <Button
                    onClick={handlePhoneSignIn}
                    disabled={loading || !phoneNumber}
                    className="w-full h-14 bg-black text-white hover:bg-neutral-800 rounded-none font-mono text-xs tracking-widest uppercase transition-all duration-300 border-0 group"
                  >
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <div className="flex items-center justify-center space-x-2">
                        <span>SEND CODE</span>
                        <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="code" className="text-black font-mono text-xs tracking-wider uppercase">
                      Verification Code
                    </Label>
                    <Input
                      id="code"
                      type="text"
                      placeholder="000000"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      className="h-14 border-0 border-b-2 border-neutral-200 focus:border-black rounded-none bg-transparent text-black placeholder:text-neutral-400 text-center text-2xl tracking-[0.5em] font-mono focus:ring-0"
                      maxLength={6}
                    />
                  </div>
                  <div className="flex space-x-0">
                    <Button
                      onClick={() => {
                        setStep('phone');
                        setVerificationCode('');
                        setError('');
                      }}
                      className="flex-1 h-14 bg-neutral-100 text-black hover:bg-neutral-200 rounded-none font-mono text-xs tracking-widest uppercase border-0"
                    >
                      ← BACK
                    </Button>
                    <Button
                      onClick={handleVerifyCode}
                      disabled={loading || !verificationCode}
                      className="flex-1 h-14 bg-black text-white hover:bg-neutral-800 rounded-none font-mono text-xs tracking-widest uppercase border-0 group"
                    >
                      {loading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <div className="flex items-center justify-center space-x-2">
                          <span>VERIFY</span>
                          <Check className="h-4 w-4" />
                        </div>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="google" className="space-y-6 mt-8">
              <div className="text-center space-y-6">
                <div className="space-y-2">
                  <p className="text-black font-mono text-xs tracking-wider uppercase">OAuth Authentication</p>
                  <p className="text-neutral-600 font-light text-sm">Continue with your Google account</p>
                </div>
                
                <Button
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full h-14 bg-white text-black border-2 border-black hover:bg-black hover:text-white rounded-none font-mono text-xs tracking-widest uppercase transition-all duration-300 group"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <div className="flex items-center justify-center space-x-3">
                      <svg className="h-5 w-5" viewBox="0 0 24 24">
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
              </div>
            </TabsContent>
          </Tabs>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-200"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-4 text-neutral-400 font-mono tracking-wider uppercase">Secure Access</span>
            </div>
          </div>

          <div className="text-center">
            <p className="text-neutral-400 font-mono text-xs tracking-wider">
              ENTERPRISE-GRADE SECURITY • ISO 27001 CERTIFIED
            </p>
          </div>
        </div>
      </div>

      <div id="recaptcha-container"></div>
    </div>
  );
}