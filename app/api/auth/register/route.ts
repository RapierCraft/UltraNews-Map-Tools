import { NextRequest, NextResponse } from "next/server"
import bcryptjs from "bcryptjs"
import { userRegistrationSchema } from "@/lib/validationSchemas"

// Mock user storage - replace with your database
const users: Array<{
  id: string
  email: string
  name?: string
  hashedPassword: string
  phone?: string
  verified: boolean
  createdAt: Date
}> = []

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = userRegistrationSchema.parse(body)

    // Check if user already exists
    const existingUser = users.find(u => u.email === validatedData.email)
    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists with this email" },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcryptjs.hash(validatedData.password, 12)

    // Create new user
    const newUser = {
      id: crypto.randomUUID(),
      email: validatedData.email,
      name: validatedData.name,
      hashedPassword,
      phone: validatedData.phone,
      verified: false,
      createdAt: new Date(),
    }

    users.push(newUser)

    return NextResponse.json({
      success: true,
      message: "Account created successfully",
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        phone: newUser.phone,
      },
    })
  } catch (error) {
    console.error("Registration error:", error)
    
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid input data" },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}