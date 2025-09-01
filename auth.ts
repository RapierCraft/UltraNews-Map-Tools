import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"
import bcryptjs from "bcryptjs"
import { z } from "zod"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name?: string
      image?: string
      phone?: string
    }
  }
  
  interface User {
    id: string
    email: string
    name?: string
    image?: string
    phone?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    email: string
    phone?: string
  }
}

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

const phoneSchema = z.object({
  phone: z.string().min(10),
  verificationCode: z.string().length(6),
})

// Mock user database - replace with your actual database
const users: Array<{
  id: string
  email: string
  name?: string
  hashedPassword?: string
  phone?: string
  verified: boolean
}> = []

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          const { email, password } = credentialsSchema.parse(credentials)
          
          // Find user in database
          const user = users.find(u => u.email === email)
          if (!user || !user.hashedPassword) {
            return null
          }
          
          // Verify password
          const isValid = await bcryptjs.compare(password, user.hashedPassword)
          if (!isValid) {
            return null
          }
          
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            phone: user.phone,
          }
        } catch {
          return null
        }
      }
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.phone = user.phone
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id
        session.user.email = token.email
        session.user.phone = token.phone
      }
      return session
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  cookies: {
    sessionToken: {
      name: "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
})