import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const verifyPhoneSchema = z.object({
  phone: z.string(),
  code: z.string().length(6),
})

// Mock OTP storage - should match send-otp route
const otpStorage = new Map<string, {
  code: string
  expiresAt: Date
  attempts: number
}>()

// Mock user storage
const users: Array<{
  id: string
  email?: string
  phone: string
  name?: string
  verified: boolean
  createdAt: Date
}> = []

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phone, code } = verifyPhoneSchema.parse(body)

    // Get stored OTP
    const stored = otpStorage.get(phone)
    if (!stored) {
      return NextResponse.json(
        { error: "No verification code found. Please request a new one." },
        { status: 400 }
      )
    }

    // Check if expired
    if (new Date() > stored.expiresAt) {
      otpStorage.delete(phone)
      return NextResponse.json(
        { error: "Verification code has expired. Please request a new one." },
        { status: 400 }
      )
    }

    // Verify code
    if (stored.code !== code) {
      return NextResponse.json(
        { error: "Invalid verification code. Please try again." },
        { status: 400 }
      )
    }

    // Clear OTP after successful verification
    otpStorage.delete(phone)

    // Find or create user
    let user = users.find(u => u.phone === phone)
    if (!user) {
      user = {
        id: crypto.randomUUID(),
        phone,
        verified: true,
        createdAt: new Date(),
      }
      users.push(user)
    } else {
      user.verified = true
    }

    return NextResponse.json({
      success: true,
      message: "Phone number verified successfully",
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
      },
    })
  } catch (error) {
    console.error("Verify phone error:", error)
    
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid input data" },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Verification failed" },
      { status: 500 }
    )
  }
}