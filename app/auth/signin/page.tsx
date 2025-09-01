import SignInModal from '@/components/auth/SignInModal'

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-neutral-900 to-neutral-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <SignInModal open={true} />
      </div>
    </div>
  )
}