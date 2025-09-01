import { NextRequest, NextResponse } from "next/server"
import { phoneSchema } from "@/lib/validationSchemas"

// Mock OTP storage - replace with Redis or database
const otpStorage = new Map<string, {
  code: string
  expiresAt: Date
  attempts: number
}>()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phone } = phoneSchema.parse(body)

    // Check rate limiting (max 3 attempts per phone per hour)
    const existing = otpStorage.get(phone)
    if (existing && existing.attempts >= 3) {
      return NextResponse.json(
        { error: "Too many OTP requests. Please try again later." },
        { status: 429 }
      )
    }

    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes

    // Store OTP
    otpStorage.set(phone, {
      code,
      expiresAt,
      attempts: (existing?.attempts || 0) + 1,
    })

    // In production, send actual SMS here
    console.log(`📱 OTP for ${phone}: ${code}`)

    return NextResponse.json({
      success: true,
      message: "Verification code sent successfully",
      expiresIn: 300, // 5 minutes in seconds
    })
  } catch (error) {
    console.error("Send OTP error:", error)
    
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid phone number format" },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Failed to send verification code" },
      { status: 500 }
    )
  }
}