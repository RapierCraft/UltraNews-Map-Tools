import { NextRequest, NextResponse } from "next/server"
import bcryptjs from "bcryptjs"
import { z } from "zod"

const verifyUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

// Mock user storage - should match register route
const users: Array<{
  id: string
  email: string
  name?: string
  hashedPassword: string
  phone?: string
  verified: boolean
}> = []

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = verifyUserSchema.parse(body)

    // Find user
    const user = users.find(u => u.email === email)
    if (!user) {
      return NextResponse.json(
        { error: "No account found with this email address" },
        { status: 404 }
      )
    }

    // Verify password
    const isValid = await bcryptjs.compare(password, user.hashedPassword)
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid password" },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        verified: user.verified,
      },
    })
  } catch (error) {
    console.error("Verify user error:", error)
    
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid input data" },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    )
  }
}